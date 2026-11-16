# PBC Dubai Portal

A modern web application built with Next.js/ReactJS, TypeScript, and Tailwind CSS for PBC Dubai, featuring a dynamic task management system and interactive user interface.

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript & JavaScript
- **Styling**: Tailwind CSS
- **UI Components**: Flowbite React, Headless UI
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Animations**: Lottie React
- **Form Handling**: React Hook Form
- **Authentication**: NextAuth.js
- **Database**: PostgreSQL

## Project Structure

```
pbc-portal/
├── app/                 # Next.js 14 app directory
│   ├── components/      # Reusable React components
│   ├── lib/            # Utility functions and helpers
│   ├── api/            # API routes
│   └── (routes)/       # Application routes
├── public/             # Static assets (images, fonts, etc.)
├── styles/             # Global styles and Tailwind configurations
├── types/              # TypeScript type definitions
├── .env.example        # Example environment variables
├── next.config.js      # Next.js configuration
├── package.json        # Project dependencies and scripts
├── postcss.config.js   # PostCSS configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── tsconfig.json       # TypeScript configuration
```

## Features

- **Modern Authentication System**
  - Secure user authentication with NextAuth.js
  - Role-based access control
  - Protected routes and API endpoints

- **Task Management**
  - Create, update, and delete tasks
  - Task categorization and filtering
  - Real-time status updates
  - Task assignments and deadlines

- **User Interface**
  - Responsive design for all devices
  - Dark mode support
  - Smooth animations and transitions
  - Accessible components
  - Interactive dashboard

- **Performance**
  - Server-side rendering with Next.js
  - Optimized image loading
  - Efficient state management
  - Fast page transitions

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager
- PostgreSQL database

### Installation

1. Clone the repository:

```bash
git clone [repository-url]
cd pbc-portal
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Set up environment variables:
   Copy `.env.example` to `.env.local` and fill in your values:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/your_database
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### Development

Start the development server:

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:3000`

### Building for Production

1. Build the application:

```bash
npm run build
# or
yarn build
```

2. Start the production server:

```bash
npm start
# or
yarn start
```

## Available Scripts

- `npm run dev` / `yarn dev` - Start development server
- `npm run build` / `yarn build` - Build for production
- `npm start` / `yarn start` - Start production server
- `npm run lint` / `yarn lint` - Run ESLint
- `npm run test` / `yarn test` - Run tests

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software owned by PBC Dubai.
All rights reserved. ©️
