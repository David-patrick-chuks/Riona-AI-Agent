import fs from 'fs';
import path from 'path';
import memoryService from './memory.service';
import logger from '@/utils/logger';

class TrainingService {
    private directivesDir: string;
    private knowledgeDir: string;

    constructor() {
        this.directivesDir = path.resolve(process.cwd(), 'training/directives');
        this.knowledgeDir = path.resolve(process.cwd(), 'training/knowledge');

        if (!fs.existsSync(this.directivesDir)) fs.mkdirSync(this.directivesDir, { recursive: true });
        if (!fs.existsSync(this.knowledgeDir)) fs.mkdirSync(this.knowledgeDir, { recursive: true });
    }

    /**
     * Load all directives into memory (Social layer)
     */
    async loadDirectives(): Promise<string> {
        const files = fs.readdirSync(this.directivesDir);
        let combined = "";
        for (const file of files) {
            const content = fs.readFileSync(path.join(this.directivesDir, file), 'utf-8');
            combined += `\n--- Directive from ${file} ---\n${content}\n`;
        }
        return combined;
    }

    /**
     * Load recent knowledge base facts
     */
    async loadKnowledge(): Promise<string> {
        const files = fs.readdirSync(this.knowledgeDir);
        let combined = "";
        for (const file of files) {
            const content = fs.readFileSync(path.join(this.knowledgeDir, file), 'utf-8');
            combined += `\n--- Knowledge from ${file} ---\n${content}\n`;
        }
        return combined;
    }

    /**
     * Helper to add a new directive manually
     */
    async addDirective(name: string, content: string) {
        const filePath = path.join(this.directivesDir, `${name}.txt`);
        fs.writeFileSync(filePath, content);
        await memoryService.remember({
            type: 'directive',
            content: `New Directive Added: ${name}`
        });
        logger.info(`New Directive saved: ${name}`);
    }
}

export default new TrainingService();
