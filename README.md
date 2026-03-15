
## Riona AI Agent 🌸

[![CI](https://github.com/david-patrick-chuks/riona-ai-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/david-patrick-chuks/riona-ai-agent/actions/workflows/ci.yml)

## Support the Project 🙌

### 🤝 **Open to Collaboration**
- [Twitter](https://twitter.com/david_patrick01)  - [Gmail](davidchuksdev@gmail.com)

If you'd like to support the development of Instagram-AI-Agent, please consider contributing to the following wallet addresses:

- **Bitcoin (BTC)**: 1GkWY6pjn7KoAkCnUab2MxnxeEQihknfUi
- **Ethereum (ETH-erc20)**: 0xabb45f4d85e7d9db5de684c35ccde7239a167cbb
- **Solana (SOL)**: EQV7fQ57zKNMFXy53WBfo2sCxtkRQVQLqj8sqWGnoyR

Your support helps keep this project running and growing! 🚀

Riona AI Agent is an AI-powered automation tool designed for **Instagram and Twitter** to automate social media interactions such as posting, liking, and commenting. It leverages advanced AI models to generate engaging content, automate interactions, and manage social media accounts efficiently.

Before using the automation features, you can personalize the agent by training with the following, including:
https://www.instagram.com/dreamlandofficial_1?igsh=NTZvcHRkNjlhYzhp
- **YouTube Video URL** 🎥
- **Audio File** 🎙️
- **Portfolio or Website Link** 🌐
- **File Formats Supported**: PDF, DOC, DOCX, TXT 📄

## Features

- **Instagram Automation**: Automatically log in, post photos, like posts, and leave thoughtful comments.
- **Twitter Automation**: Automatically tweet, retweet, and like tweets.
- **AI-Powered Content Generation**: Use Google Generative AI to create engaging captions and comments for Instagram and Twitter.
- **Proxy Support**: Use proxies to manage multiple accounts and avoid rate limits.
- **Cookie Management**: Save and load cookies to maintain sessions across restarts.

**Upcoming Features:**

GitHub automation is planned for future development.

## Installation

1. **Clone the repository**:

   ```sh
   git clone https://github.com/david-patrick-chuks/riona-ai-agent.git
   cd riona-ai-agent
   ```

2. **Install dependencies**:

   ```sh
   npm install
   ```

3. **Set up environment variables**:
   Rename the `.env.example` file to `.env` in the root directory and add your Instagram credentials. Refer to the `.env.example` file for the required variables.
   ```dotenv # Instagram credentials
   IGusername=your_instagram_username
   IGpassword=your_instagram_password 
   
   Xusername= #Twitter username
   Xpassword= #Twitter password

   MONGODB_URI= #MongoDB URI
   
   # Gemini API keys (set only the ones you use)
   GEMINI_API_KEY=your_primary_gemini_api_key
   GEMINI_API_KEY_1=your_gemini_api_key_1
   GEMINI_API_KEY_2=your_gemini_api_key_2
   
   # Optional: locale-specific ad/sponsored markers (comma-separated)
   IG_AD_MARKERS=sponsored,paid partnership,paid partnership with
   IG_AD_BUTTON_MARKERS=learn more,shop now,sign up,install now,get offer,subscribe,book now

   # Optional: run Instagram agent loop automatically
   IG_AGENT_ENABLED=false
   IG_AGENT_INTERVAL_MS=30000
   
   # Optional: daily limit for IG actions (likes/comments). 0 = unlimited
   IG_DAILY_MAX_ACTIONS=0
   
   # Optional: logging backend ("winston" or "console")
   LOGGER=console
   ```

## MongoDB Setup (Using Docker)

1. **Install Docker**:
   If you don't have Docker installed, download and install it from the [official website](https://www.docker.com/products/docker-desktop/)
2. **Run MongoDB using Docker Container**:

    **Option 1:**
      ```sh
      docker run -d -p 27017:27017 --name instagram-ai-mongodb mongodb/mongodb-community-server:latest
      ```
    **Option 2:**
      ```sh
      docker run -d -p 27017:27017 --name instagram-ai-mongodb -v mongodb_data:/data/db mongodb/mongodb-community-server:latest
      ```   
      (Option 2: use this if you want to have like a permanent storage in you so your data won't be lost or remove if you stop or remove your Docker container)
3. **Modify the MONGODB_URI in the .env file**:
   ```dotenv
   MONGODB_URI=mongodb://localhost:27017/instagram-ai-agent
   ```
4. **Verify the connection**:
   Open a new terminal and run the following command:
   ```sh
   docker ps
   ```
   You should see the MongoDB container running.

   Docker Commands (Additional Info):
   - To stop the MongoDB container:
     ```sh
     docker stop instagram-ai-mongodb
     ```
   - To start the MongoDB container:
       ```sh
       docker start instagram-ai-mongodb
       ```
   - To remove the MongoDB container:
      ```sh
      docker rm instagram-ai-mongodb
      ```
   - To remove the MongoDB container and its data:
      ```sh
      docker rm -v instagram-ai-mongodb
      ```

## Usage

1. **Run the agent**:
   ```sh
   npm start
   ```
   Note: The specific platform (Instagram, Twitter) and actions performed by the agent are typically configured through environment variables in the `.env` file, or by selections made if the application prompts for choices at runtime.

2. **Log in and trigger interactions via API**:
   ```sh
   curl -X POST http://localhost:3000/api/login \
     -H "Content-Type: application/json" \
     -d '{"username":"YOUR_IG_USERNAME","password":"YOUR_IG_PASSWORD"}'
   ```
   ```sh
   curl -X POST http://localhost:3000/api/interact \
     -H "Content-Type: application/json" \
     --cookie "token=YOUR_JWT_TOKEN"
   ```

3. **Optional: auto-run the Instagram agent loop**
   Set `IG_AGENT_ENABLED=true` in `.env` to run the interaction loop continuously.

## Development

- Run tests: `npm test`
- Lint: `npm run lint`
- Format: `npm run format`

## Guides

- `Guides/Instagram-Bot.md`
- `Guides/Operations.md`
- `Guides/API.md`
- `Guides/Env.md`
- `Guides/Testing.md`
- `Guides/CI.md`
- `Guides/FAQ.md`
- `Guides/Logging.md`

## Project Policies

- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- `LICENSE`

## Project Structure

- **src/client**: Contains the main logic for interacting with social media platforms like Instagram.
- **src/config**: Configuration files, including the logger setup.
- **src/utils**: Utility functions for handling errors, cookies, data saving, etc.
- **src/Agent**: Contains the AI agent logic and training scripts.
- **src/Agent/training**: Training scripts for the AI agent.
- **src/Agent/schema**: Schema definitions for AI-generated content and database models.
- **src/test**: Contains test data and scripts, such as example tweets.

## Logging

The project uses a custom logger to log information, warnings, and errors. Logs are saved in the [logs](http://_vscodecontentref_/3) directory.

## Error Handling

Process-level error handlers are set up to catch unhandled promise rejections, uncaught exceptions, and process warnings. Errors are logged using the custom logger.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request with your changes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Stargazers
Thank you to all our supporters!

[![Star History Chart](https://api.star-history.com/svg?repos=David-patrick-chuks/Riona-AI-Agent&type=Date)](https://www.star-history.com/#David-patrick-chuks/Riona-AI-Agent&Date)

## 

<p align="center">
Built with ❤️ by David Patrick 
</p>
