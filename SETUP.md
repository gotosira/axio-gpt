# AXIO-GPT Setup Guide

## Prerequisites
- Node.js 18+ installed
- Google Cloud Console account
- OpenAI API key

## 1. Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_ORG=your-openai-org-id
OPENAI_PROJECT=your-openai-project-id
OPENAI_MODEL=gpt-5
OPENAI_INSTRUCTIONS=You are a helpful assistant.
APP_OPENAI_API_KEY=your-openai-api-key
ASSISTANT_ID=your-assistant-id
NEXT_PUBLIC_ASSISTANT_ID=your-assistant-id
NEXT_PUBLIC_APP_NAME=AXIO-GPT

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-key

# Google OAuth (Get these from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Database
DATABASE_URL="file:./dev.db"
```

## 2. Google OAuth Setup

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `AXIO-GPT` (or any name you prefer)
4. Click "Create"

### Step 2: Enable Google+ API
1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google+ API" or "Google Identity"
3. Click on "Google+ API" and click "Enable"
4. Also enable "Google Identity" if available

### Step 3: Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type
3. Fill in required fields:
   - **App name**: `AXIO-GPT`
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Click "Save and Continue"
5. Skip "Scopes" for now, click "Save and Continue"
6. Add your email as a test user, click "Save and Continue"
7. Review and click "Back to Dashboard"

### Step 4: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Set name: `AXIO-GPT Web Client`
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `http://localhost:3000` (for development)
6. Click "Create"
7. **Copy the Client ID and Client Secret** - you'll need these for your `.env.local` file

### Step 5: Update Environment Variables
Add the credentials to your `.env.local` file:
```bash
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

## 3. Generate NextAuth Secret

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

Copy the output to `NEXTAUTH_SECRET` in your `.env.local` file.

## 4. Install Dependencies

```bash
npm install
```

## 5. Setup Database

```bash
npx prisma generate
npx prisma migrate dev
```

## 6. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3001` (or 3000 if available).

## Features

✅ **Google Authentication** - Sign in with Google account
✅ **Conversation Persistence** - All chats are saved to database
✅ **Real-time Chat** - Streaming responses from OpenAI
✅ **Assistant Integration** - Use your custom OpenAI Assistant
✅ **Conversation Management** - Create, load, and delete conversations
✅ **User Profile** - Display user info and avatar
✅ **Responsive Design** - Works on all devices
✅ **Modern UI** - ChatGPT.com-like interface

## Usage

1. Sign in with your Google account
2. Start a new conversation or load an existing one
3. Chat with the AI assistant
4. All conversations are automatically saved
5. Switch between conversations using the sidebar
6. Delete conversations with the × button

## Troubleshooting

- Make sure all environment variables are set correctly
- Check that Google OAuth credentials are valid
- Ensure the database is properly initialized
- Verify OpenAI API key has sufficient credits
