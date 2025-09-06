# Flight Booking System with Stripe Escrow

A comprehensive NextJS application for flight booking with Stripe escrow functionality, built with TypeScript, Prisma, PostgreSQL, and Tailwind CSS.

## Features

- 🎫 **Flight Search & Booking**: Search flights by origin, destination, and date
- 💳 **Stripe Escrow**: Payment authorization with hold/capture mechanism
- 👥 **User Management**: Regular users and admin roles
- ✈️ **Flight Management**: Admin can create, edit, and delete flights
- 🛡️ **Minimum Seat Requirements**: Flights require minimum seats or refunds are processed
- 💰 **Automatic Refunds**: System checks flights 3 days before departure and processes refunds
- 📱 **Responsive Design**: Mobile-first design with Tailwind CSS

## Tech Stack

- **Frontend**: NextJS 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Payments**: Stripe (with escrow/hold functionality)
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Stripe account (for payment processing)

## Getting Started

### 1. Clone and Install Dependencies

```bash
cd stripe-escrow
npm install
```

### 2. Environment Setup

Update the `.env` file with your configuration:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/stripe_escrow?schema=public"

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Application
NODE_ENV=development
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Create and run migrations
npm run db:migrate

# Seed the database with sample data
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Default Login Credentials

After seeding the database, you can use these credentials:

**Admin User:**
- Email: `admin@example.com`
- Password: `password`

**Regular Users:**
- Email: `user1@example.com` to `user10@example.com`
- Password: `password`

## Database Schema

The application uses the following main models:

- **User**: User accounts with admin roles
- **Aircraft**: Aircraft types with seat configurations
- **Flight**: Flight information with pricing and seat management
- **Booking**: Flight bookings with Stripe payment integration

## API Endpoints

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth.js authentication

### Flights
- `GET /api/flights` - List flights (with search filters)
- `POST /api/flights` - Create flight (admin only)
- `PUT /api/flights/[id]` - Update flight (admin only)
- `DELETE /api/flights/[id]` - Delete flight (admin only)

### Bookings
- `POST /api/bookings` - Create booking with Stripe payment
- `POST /api/bookings/confirm` - Confirm booking after payment

### Aircraft
- `GET /api/aircraft` - List aircraft types

### Refunds
- `POST /api/refunds/check` - Check and process refunds

## Stripe Escrow Flow

1. **Authorization**: When a user books a flight, a Stripe PaymentIntent is created with `capture_method: 'manual'`
2. **Hold**: The payment is authorized and held (not captured immediately)
3. **Validation**: 3 days before flight departure, the system checks if minimum seats are sold
4. **Capture/Cancel**: 
   - If minimum seats met: Payment is captured
   - If minimum seats not met: Payment is cancelled/refunded

## Admin Features

- View all flights and statistics
- Create, edit, and delete flights
- Run refund checks manually
- View booking statistics

## User Features

- Search flights by origin, destination, and date
- Book flights with multiple seats
- View flight details including minimum seat requirements
- Responsive booking interface

## File Structure

```
src/
├── app/
│   ├── api/           # API routes
│   ├── admin/         # Admin dashboard
│   ├── auth/          # Authentication pages
│   └── page.tsx       # Main flight search page
├── components/
│   └── providers/     # Context providers
├── lib/
│   ├── prisma.ts      # Prisma client
│   └── stripe.ts      # Stripe configuration
└── types/
    └── next-auth.d.ts # NextAuth type definitions
```

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database operations
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run migrations  
npm run db:seed        # Seed database

# Code quality
npm run lint          # ESLint
```

## Deployment Notes

1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Set up Stripe webhooks for production
5. Configure NextAuth.js for your domain

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for demonstration purposes. Please ensure you have proper licenses for all dependencies in production use.
