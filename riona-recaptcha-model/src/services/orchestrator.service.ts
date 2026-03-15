import brainService from '@/services/brain.service';
import pilotService from '@/services/pilot.service';
import memoryService from '@/services/memory.service';
import reporterService from '@/services/reporter.service';
import trainingService from '@/services/training.service';
import recaptchaController from '@/controllers/recaptcha.controller';
import mlService from '@/services/ml.service';
import CONFIG from '@/config/default';
import logger from '@/utils/logger';
import fs from 'fs';
import path from 'path';

class rionaOrchestrator {
    private isRunning: boolean = false;
    private currentErrand: string = "";
    private currentCycle: number = 0;

    /**
     * Start an errand
     */
    async runErrand(errand: string) {
        if (this.isRunning) {
            logger.warn("An errand is already running.");
            return;
        }

        this.isRunning = true;
        this.currentErrand = errand;
        reporterService.report({ type: 'system', message: `Starting Errand: ${errand}` });

        try {
            if (!pilotService.page) {
                await pilotService.launch({ headless: false });
                reporterService.report({ type: 'system', message: 'Browser launched. Navigating to home...' });
            } else {
                reporterService.report({ type: 'system', message: 'Using existing browser session...' });
            }

            // 1. Initial Navigation (assuming auth_token bypass is handled at context launch or via cookie injection)
            await pilotService.page?.goto('https://x.com/home', { waitUntil: 'networkidle' });

            // 2. The Loop
            let cycle = 0;
            const maxCycles = 20; // Safety cap

            while (this.isRunning && cycle < maxCycles) {
                cycle++;
                this.currentCycle = cycle;
                logger.info(`--- Cycle ${cycle} ---`);

                // Rotation Strategy: Check notifications every 3 cycles
                if (cycle % 3 === 0) {
                    logger.info("Social Check: Navigating to notifications...");
                    await pilotService.page?.goto('https://x.com/notifications', { waitUntil: 'networkidle' });
                }

                // SEE
                const screenshot = await pilotService.captureScreenshot();
                if (!screenshot) throw new Error("Failed to capture screenshot");

                // Save for debug
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `cycle-${cycle}-${timestamp}.png`;
                const filePath = path.join(CONFIG.PATHS.DEBUG_DIR, filename);

                if (!fs.existsSync(CONFIG.PATHS.DEBUG_DIR)) {
                    fs.mkdirSync(CONFIG.PATHS.DEBUG_DIR, { recursive: true });
                }
                fs.writeFileSync(filePath, Buffer.from(screenshot, 'base64'));

                reporterService.report({
                    type: 'system',
                    message: `Screenshot saved: ${filename}`,
                    details: { imagePath: `/debug/${filename}` }
                });

                // Get some memory context (e.g., recent observations)
                const recentObservations = await memoryService.searchObservations("", 5);
                const memoryContext = recentObservations.map(m => m.content).join("\n");

                // Get training context
                const directives = await trainingService.loadDirectives();
                const knowledge = await trainingService.loadKnowledge();

                // THINK
                const systemPrompt = this.generateSystemPrompt(directives, knowledge);
                reporterService.report({ type: 'system', message: 'Consulting Brain...' });
                const thoughts = await brainService.think({
                    systemPrompt,
                    userMessage: `
Current Goal: ${this.currentErrand}
Memory of recent actions:
${memoryContext}

I have just taken this screenshot. What is my next move? If I see a specific "seating arrangement" reCAPTCHA challenge, I should flag it as "CAPTCHA_SEATING" in my thought.
                    `,
                    mediaParts: [{
                        inline_data: {
                            mime_type: 'image/png',
                            data: screenshot
                        }
                    }],
                    model: "default"
                });

                // RECAPTCHA FALLBACK: If Brain identifies a seating challenge, use our specific CNN
                if (thoughts.text.includes("CAPTCHA_SEATING") && mlService.isLoaded()) {
                    reporterService.report({ type: 'system', message: 'Specific reCAPTCHA detected. Triggering CNN Fallback...' });
                    // Integration logic for internal solver goes here
                }

                // ACT
                await this.executeDecision(thoughts.text);

                // Short wait to see result
                await new Promise(r => setTimeout(r, 3000));
            }

            logger.info("Errand cycle limit reached or task stopped.");
        } catch (err: any) {
            logger.error(`Orchestrator Error: ${err.message}`);
        } finally {
            this.isRunning = false;
            // Keep browser open for preview as requested, unless explicitly told to close
        }
    }

    private generateSystemPrompt(directives: string = "", knowledge: string = ""): string {
        return `
            You are riona AI, a human-like agent operating on Twitter (X).
            Your goal is to execute errands while mimicking human behavior perfectly.
            
            PERSONALITY & DIRECTIVES:
            ${directives || "Follow the user's errand with a helpful and mysterious tone."}
            
            KNOWLEDGE BASE:
            ${knowledge || "Use your general knowledge of the web."}
            
            When providing a decision, you MUST output a JSON object with the following structure:
            {
                "thought": "Brief explanation of your reasoning",
                "action": "click" | "type" | "scroll" | "wait" | "finish",
                "coordinate": [x, y], // Relative to 1280x720 or specific to screenshot
                "value": "text to type if action is type",
                "reason": "Why this specific action helps the goal"
            }
            
            Guidelines:
            - Don't be too fast.
            - If you see a CAPTCHA or Login screen, state it in your thought.
            - Be strategic. Look for engagement opportunities.
        `;
    }

    private async executeDecision(decisionText: string) {
        try {
            // Attempt to parse JSON from LLM7 response
            const jsonMatch = decisionText.match(/\{.*\}/s);
            if (!jsonMatch) {
                logger.warn("Brain did not return structured JSON. Response: " + decisionText);
                return;
            }

            const decision = JSON.parse(jsonMatch[0]);

            // Report to Dashboard
            reporterService.report({ type: 'thought', message: decision.thought });
            reporterService.report({ type: 'action', message: `Executing ${decision.action}: ${decision.reason}` });

            if (decision.action === 'click' && decision.coordinate) {
                await pilotService.humanClick(undefined, { x: decision.coordinate[0], y: decision.coordinate[1] });
            } else if (decision.action === 'type' && decision.value) {
                await pilotService.humanType(decision.value);
                await pilotService.page?.keyboard.press('Enter');
            } else if (decision.action === 'scroll') {
                await pilotService.page?.mouse.wheel(0, 500 + Math.random() * 500);
            } else if (decision.action === 'finish') {
                this.isRunning = false;
                logger.info("Task marked as finished by Brain.");
            }

            // Record memory
            await memoryService.remember({
                type: 'observation',
                content: `Action: ${decision.action} | Thought: ${decision.thought}`,
                metadata: {
                    ...decision,
                    cycle: this.currentCycle
                }
            });

        } catch (err: any) {
            logger.error("Failed to execute decision: " + err.message);
        }
    }

    stop() {
        this.isRunning = false;
    }
}

export default new rionaOrchestrator();
