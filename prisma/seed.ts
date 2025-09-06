import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('password', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      name: 'Admin User',
      isAdmin: true,
    },
  });

  // Create regular users
  const userPassword = await bcrypt.hash('password', 10);
  const users = [];
  
  for (let i = 1; i <= 10; i++) {
    const user = await prisma.user.upsert({
      where: { email: `user${i}@example.com` },
      update: {},
      create: {
        email: `user${i}@example.com`,
        password: userPassword,
        name: `User ${i}`,
        isAdmin: false,
      },
    });
    users.push(user);
  }

  // Create aircraft
  const aircraftData = [
    { model: 'A320', manufacturer: 'Airbus' },
    { model: '737-800', manufacturer: 'Boeing' },
    { model: 'A350', manufacturer: 'Airbus' },
    { model: '787 Dreamliner', manufacturer: 'Boeing' },
    { model: 'A380', manufacturer: 'Airbus' },
  ];

  const aircraft = [];
  for (const data of aircraftData) {
    const plane = await prisma.aircraft.create({
      data: {
        ...data,
        totalSeats: 15,
      },
    });
    aircraft.push(plane);
  }

  // Create flights
  const cities = [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
    'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'
  ];

  const flights = [];
  for (let i = 1; i <= 20; i++) {
    const origin = cities[Math.floor(Math.random() * cities.length)];
    let destination = cities[Math.floor(Math.random() * cities.length)];
    while (destination === origin) {
      destination = cities[Math.floor(Math.random() * cities.length)];
    }

    const departureTime = new Date();
    departureTime.setDate(departureTime.getDate() + Math.floor(Math.random() * 30) + 1);
    departureTime.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

    const arrivalTime = new Date(departureTime);
    arrivalTime.setHours(arrivalTime.getHours() + Math.floor(Math.random() * 6) + 1);

    const soldSeats = Math.floor(Math.random() * 8); // Random sold seats 0-7
    const minimumSeats = Math.floor(Math.random() * 5) + 3; // Random minimum seats 3-7

    const flight = await prisma.flight.create({
      data: {
        flightNumber: `FL${String(i).padStart(3, '0')}`,
        origin,
        destination,
        departureTime,
        arrivalTime,
        price: Math.floor(Math.random() * 500) + 100, // $100-$600
        totalSeats: 15,
        availableSeats: 15 - soldSeats,
        soldSeats,
        minimumSeats,
        aircraftId: aircraft[Math.floor(Math.random() * aircraft.length)].id,
      },
    });
    flights.push(flight);
  }

  // Create some bookings for flights with sold seats
  for (const flight of flights) {
    if (flight.soldSeats > 0) {
      for (let i = 0; i < flight.soldSeats; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        await prisma.booking.create({
          data: {
            passengerName: randomUser.name,
            passengerEmail: randomUser.email,
            seatsBooked: 1,
            totalAmount: flight.price,
            status: Math.random() > 0.2 ? 'CONFIRMED' : 'PENDING', // 80% confirmed
            userId: randomUser.id,
            flightId: flight.id,
          },
        });
      }
    }
  }

  console.log('✅ Seed completed successfully!');
  console.log(`Created:`);
  console.log(`- 1 admin user (admin@example.com / password)`);
  console.log(`- 10 regular users (user1@example.com - user10@example.com / password)`);
  console.log(`- ${aircraft.length} aircraft`);
  console.log(`- ${flights.length} flights`);
  console.log(`- Bookings for flights with sold seats`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
