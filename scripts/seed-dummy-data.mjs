import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { MongoClient, ObjectId } from "mongodb";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "trimly";

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in environment or .env.local");
  process.exit(1);
}

async function main() {
  console.log("==================================================");
  console.log("  TRIMLY - DUMMY SEED SCRIPT (4 BARBERS & 5 CUSTOMERS)");
  console.log("==================================================\n");

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  const hashedPassword = await bcrypt.hash("Password123!", 10);
  const now = new Date();

  // 1. Remove previous test users and barbers with domain @trimly.test
  console.log("Cleaning up any existing @trimly.test records...");
  const oldUsers = await db.collection("users").find({ email: /@trimly\.test$/i }).toArray();
  const oldUserIds = oldUsers.map((u) => u._id.toString());

  if (oldUserIds.length > 0) {
    await db.collection("users").deleteMany({ email: /@trimly\.test$/i });
    await db.collection("barbers").deleteMany({ userId: { $in: oldUserIds } });
    await db.collection("bookings").deleteMany({
      $or: [{ userId: { $in: oldUserIds } }, { barberId: { $in: oldUserIds } }],
    });
    await db.collection("reviews").deleteMany({ userId: { $in: oldUserIds } });
    await db.collection("notification_preferences").deleteMany({ userId: { $in: oldUserIds } });
  }

  // 2. Define 4 Realistic Barbers
  const barbersData = [
    {
      user: {
        name: "Vikram Malhotra",
        email: "vikram.barber@trimly.test",
        password: hashedPassword,
        phone: "+91 98260 11223",
        role: "barber",
        active: true,
        emailVerified: true,
        sessionVersion: 0,
        createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      },
      barber: {
        name: "Vikram Malhotra",
        shopName: "The Urban Gentleman Barber Co.",
        phone: "+91 98260 11223",
        city: "Bhopal",
        area: "Arera Colony",
        address: "E-4, Near 10 No. Market, Arera Colony, Bhopal, MP",
        location: {
          type: "Point",
          coordinates: [77.4126, 23.2599], // Bhopal coords
        },
        bio: "Master barber with over 9 years of precision grooming experience. Specializing in textured tapers, skin fades, royal hot-towel beard shaping, and traditional straight razor shaves.",
        workingHours: { open: "09:00", close: "21:00" },
        closedDays: ["tuesday"],
        slotIntervalMinutes: 30,
        leadTimeMinutes: 15,
        bookingHorizonDays: 60,
        timezone: "Asia/Kolkata",
        staffCount: 4,
        chairsCount: 6,
        specialties: ["Skin Fades", "Beard Sculpting", "Hot Towel Shave", "Charcoal Facial"],
        shopExteriorImage: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80",
        shopInteriorImage: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=80",
        workPhotos: [
          "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&q=80",
          "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&q=80",
          "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?w=600&q=80",
        ],
        services: [
          { id: "srv_1", name: "Signature Haircut & Style", price: 250, duration: 35, durationMinutes: 35 },
          { id: "srv_2", name: "Luxury Beard Grooming & Shape", price: 150, duration: 25, durationMinutes: 25 },
          { id: "srv_3", name: "Royal Hot Towel Straight Razor Shave", price: 180, duration: 30, durationMinutes: 30 },
          { id: "srv_4", name: "Deep Cleansing Charcoal Facial", price: 450, duration: 40, durationMinutes: 40 },
          { id: "srv_5", name: "Refreshing Scalp & Head Massage", price: 200, duration: 20, durationMinutes: 20 },
        ],
        verificationStatus: "verified",
        verifiedAt: new Date(now.getTime() - 55 * 24 * 60 * 60 * 1000),
        waitingTime: 5,
        averageRating: 4.9,
        rating: 4.9,
        reviewCount: 3,
        createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
        updatedAt: now,
      },
    },
    {
      user: {
        name: "Arjun Sharma",
        email: "arjun.barber@trimly.test",
        password: hashedPassword,
        phone: "+91 98200 44556",
        role: "barber",
        active: true,
        emailVerified: true,
        sessionVersion: 0,
        createdAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
      },
      barber: {
        name: "Arjun Sharma",
        shopName: "Fade & Blade Grooming Studio",
        phone: "+91 98200 44556",
        city: "Mumbai",
        area: "Bandra West",
        address: "Shop 12, Hill Road, Near Mehboob Studio, Bandra West, Mumbai",
        location: {
          type: "Point",
          coordinates: [72.8347, 19.0596],
        },
        bio: "Modern bespoke men's grooming lounge catering to celebrities and trendsetters. Award-winning stylist known for creative scissor work and textured French crops.",
        workingHours: { open: "10:00", close: "21:30" },
        closedDays: ["monday"],
        slotIntervalMinutes: 30,
        leadTimeMinutes: 30,
        bookingHorizonDays: 45,
        timezone: "Asia/Kolkata",
        staffCount: 5,
        chairsCount: 8,
        specialties: ["Precision Scissor Cut", "Hair Coloring", "Beard Styling", "Hair Spa"],
        shopExteriorImage: "https://images.unsplash.com/photo-1534778356534-d3d45b6df1da?w=800&q=80",
        shopInteriorImage: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=80",
        workPhotos: [
          "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&q=80",
          "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=80",
        ],
        services: [
          { id: "srv_b2_1", name: "Classic Scissor Haircut", price: 350, duration: 40, durationMinutes: 40 },
          { id: "srv_b2_2", name: "Beard Trim & Razor Lineup", price: 200, duration: 25, durationMinutes: 25 },
          { id: "srv_b2_3", name: "Keratin Smooth Hair Spa", price: 800, duration: 50, durationMinutes: 50 },
          { id: "srv_b2_4", name: "Premium Global Hair Color", price: 950, duration: 60, durationMinutes: 60 },
        ],
        verificationStatus: "verified",
        verifiedAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
        waitingTime: 10,
        averageRating: 4.8,
        rating: 4.8,
        reviewCount: 2,
        createdAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
        updatedAt: now,
      },
    },
    {
      user: {
        name: "Rohan Verma",
        email: "rohan.barber@trimly.test",
        password: hashedPassword,
        phone: "+91 98110 77889",
        role: "barber",
        active: true,
        emailVerified: true,
        sessionVersion: 0,
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      },
      barber: {
        name: "Rohan Verma",
        shopName: "Crown & Comb Salon",
        phone: "+91 98110 77889",
        city: "Delhi",
        area: "Connaught Place",
        address: "Inner Circle, Block C, Connaught Place, New Delhi",
        location: {
          type: "Point",
          coordinates: [77.2167, 28.6328],
        },
        bio: "Heritage grooming salon delivering elite gentleman cuts, classic pompadours, and executive facial treatments in the heart of the capital.",
        workingHours: { open: "09:30", close: "20:30" },
        closedDays: ["wednesday"],
        slotIntervalMinutes: 30,
        leadTimeMinutes: 20,
        bookingHorizonDays: 30,
        timezone: "Asia/Kolkata",
        staffCount: 3,
        chairsCount: 5,
        specialties: ["Executive Styling", "Organic Hair Spa", "Classic Shaves"],
        shopExteriorImage: "https://images.unsplash.com/photo-1593702295094-aea22597af65?w=800&q=80",
        shopInteriorImage: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=800&q=80",
        workPhotos: [
          "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600&q=80",
          "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&q=80",
        ],
        services: [
          { id: "srv_b3_1", name: "Executive Grooming Combo", price: 500, duration: 50, durationMinutes: 50 },
          { id: "srv_b3_2", name: "Traditional Wet Shave", price: 150, duration: 20, durationMinutes: 20 },
          { id: "srv_b3_3", name: "Deep Conditioning Hair Spa", price: 600, duration: 45, durationMinutes: 45 },
          { id: "srv_b3_4", name: "Express Modern Haircut", price: 200, duration: 30, durationMinutes: 30 },
        ],
        verificationStatus: "verified",
        verifiedAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
        waitingTime: 0,
        averageRating: 4.7,
        rating: 4.7,
        reviewCount: 2,
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        updatedAt: now,
      },
    },
    {
      user: {
        name: "Karan Patel",
        email: "karan.barber@trimly.test",
        password: hashedPassword,
        phone: "+91 98450 33445",
        role: "barber",
        active: true,
        emailVerified: true,
        sessionVersion: 0,
        createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      },
      barber: {
        name: "Karan Patel",
        shopName: "Vintage Heritage Barber Lounge",
        phone: "+91 98450 33445",
        city: "Bengaluru",
        area: "Indiranagar",
        address: "100 Feet Road, 12th Main, HAL 2nd Stage, Indiranagar, Bengaluru",
        location: {
          type: "Point",
          coordinates: [77.6412, 12.9784],
        },
        bio: "Vintage-themed barbershop serving handcrafted grooming rituals, beard oil therapies, and old-school pomades.",
        workingHours: { open: "09:00", close: "21:00" },
        closedDays: [],
        slotIntervalMinutes: 30,
        leadTimeMinutes: 15,
        bookingHorizonDays: 60,
        timezone: "Asia/Kolkata",
        staffCount: 6,
        chairsCount: 8,
        specialties: ["Vintage Pompadour", "Moustache Styling", "Beard Oil Therapy"],
        shopExteriorImage: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80",
        shopInteriorImage: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=80",
        workPhotos: [
          "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&q=80",
        ],
        services: [
          { id: "srv_b4_1", name: "Vintage Cut & Beard Styling", price: 400, duration: 45, durationMinutes: 45 },
          { id: "srv_b4_2", name: "Moustache Trimming & Waxing", price: 100, duration: 15, durationMinutes: 15 },
          { id: "srv_b4_3", name: "Beard Spa & Hot Oil Therapy", price: 350, duration: 30, durationMinutes: 30 },
          { id: "srv_b4_4", name: "Anti-Dandruff Scalp Treatment", price: 550, duration: 40, durationMinutes: 40 },
        ],
        verificationStatus: "verified",
        verifiedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        waitingTime: 0,
        averageRating: 5.0,
        rating: 5.0,
        reviewCount: 2,
        createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        updatedAt: now,
      },
    },
  ];

  const createdBarbers = [];

  for (const bData of barbersData) {
    const userRes = await db.collection("users").insertOne(bData.user);
    const userId = userRes.insertedId.toString();

    const barberDoc = {
      ...bData.barber,
      userId,
    };
    const barberRes = await db.collection("barbers").insertOne(barberDoc);
    const barberId = barberRes.insertedId.toString();

    createdBarbers.push({
      id: barberId,
      userId,
      name: bData.barber.name,
      shopName: bData.barber.shopName,
      email: bData.user.email,
      services: bData.barber.services,
    });
    console.log(`✓ Created Barber: ${bData.barber.shopName} (${bData.user.email})`);
  }

  // 3. Define 5 Realistic Customers
  const customersData = [
    {
      name: "Rahul Mehra",
      email: "rahul.customer@trimly.test",
      phone: "+91 99887 11223",
    },
    {
      name: "Amitabh Sen",
      email: "amitabh.customer@trimly.test",
      phone: "+91 99887 22334",
    },
    {
      name: "Priya Nair",
      email: "priya.customer@trimly.test",
      phone: "+91 99887 33445",
    },
    {
      name: "Siddharth Jain",
      email: "siddharth.customer@trimly.test",
      phone: "+91 99887 44556",
    },
    {
      name: "Devansh Gupta",
      email: "devansh.customer@trimly.test",
      phone: "+91 99887 55667",
    },
  ];

  const createdCustomers = [];

  for (const cData of customersData) {
    const userDoc = {
      name: cData.name,
      email: cData.email,
      password: hashedPassword,
      phone: cData.phone,
      role: "user",
      active: true,
      emailVerified: true,
      sessionVersion: 0,
      createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    };
    const res = await db.collection("users").insertOne(userDoc);
    const userId = res.insertedId.toString();

    // Default notification preferences
    await db.collection("notification_preferences").insertOne({
      userId,
      enabled: true,
      bookingUpdates: true,
      reminders: true,
      marketing: false,
      createdAt: now,
      updatedAt: now,
    });

    createdCustomers.push({
      id: userId,
      name: cData.name,
      email: cData.email,
    });
    console.log(`✓ Created Customer: ${cData.name} (${cData.email})`);
  }

  // 4. Create Initial Bookings & Reviews for realistic test flows
  console.log("\nPopulating realistic appointments & reviews for testing...");

  // Booking 1: Customer 1 (Rahul) has an UPCOMING CONFIRMED haircut tomorrow at 11:00 AM with Vikram
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(11, 0, 0, 0);

  const b1 = {
    userId: createdCustomers[0].id,
    customerName: createdCustomers[0].name,
    barberId: createdBarbers[0].id,
    barberName: createdBarbers[0].name,
    barberShopName: createdBarbers[0].shopName,
    serviceId: createdBarbers[0].services[0].id,
    service: createdBarbers[0].services[0].name,
    price: createdBarbers[0].services[0].price,
    duration: createdBarbers[0].services[0].duration,
    timeSlot: tomorrow.toISOString(),
    status: "confirmed",
    createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
  };
  await db.collection("bookings").insertOne(b1);
  console.log(`✓ Created Upcoming Confirmed Booking for ${createdCustomers[0].name} with ${createdBarbers[0].shopName}`);

  // Booking 2: Customer 1 (Rahul) has a COMPLETED booking from yesterday (READY TO RATE & REVIEW!)
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(16, 30, 0, 0);

  const b2 = {
    userId: createdCustomers[0].id,
    customerName: createdCustomers[0].name,
    barberId: createdBarbers[0].id,
    barberName: createdBarbers[0].name,
    barberShopName: createdBarbers[0].shopName,
    serviceId: createdBarbers[0].services[1].id,
    service: createdBarbers[0].services[1].name,
    price: createdBarbers[0].services[1].price,
    duration: createdBarbers[0].services[1].duration,
    timeSlot: yesterday.toISOString(),
    status: "completed",
    createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: yesterday,
  };
  const b2Res = await db.collection("bookings").insertOne(b2);
  console.log(`✓ Created Completed Booking (Unreviewed) for ${createdCustomers[0].name} (Ready to test Rate & Review button)`);

  // Booking 3: Customer 2 (Amitabh) has an ALREADY REVIEWED past booking with Barber 1 (Vikram)
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  threeDaysAgo.setHours(14, 0, 0, 0);

  const b3 = {
    userId: createdCustomers[1].id,
    customerName: createdCustomers[1].name,
    barberId: createdBarbers[0].id,
    barberName: createdBarbers[0].name,
    barberShopName: createdBarbers[0].shopName,
    serviceId: createdBarbers[0].services[0].id,
    service: createdBarbers[0].services[0].name,
    price: createdBarbers[0].services[0].price,
    duration: createdBarbers[0].services[0].duration,
    timeSlot: threeDaysAgo.toISOString(),
    status: "completed",
    createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: threeDaysAgo,
  };
  const b3Res = await db.collection("bookings").insertOne(b3);

  // Review for Booking 3
  await db.collection("reviews").insertOne({
    barberId: createdBarbers[0].id,
    bookingId: b3Res.insertedId.toString(),
    userId: createdCustomers[1].id,
    userName: createdCustomers[1].name,
    serviceName: b3.service,
    rating: 5,
    comment: "Hands down the best skin fade in Bhopal! Vikram really takes his time and ensures perfection.",
    createdAt: threeDaysAgo,
    updatedAt: threeDaysAgo,
  });

  // Booking 4: Customer 3 (Priya) reviewed Barber 2 (Arjun in Mumbai)
  const fiveDaysAgo = new Date(now);
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  fiveDaysAgo.setHours(15, 0, 0, 0);

  const b4 = {
    userId: createdCustomers[2].id,
    customerName: createdCustomers[2].name,
    barberId: createdBarbers[1].id,
    barberName: createdBarbers[1].name,
    barberShopName: createdBarbers[1].shopName,
    serviceId: createdBarbers[1].services[0].id,
    service: createdBarbers[1].services[0].name,
    price: createdBarbers[1].services[0].price,
    duration: createdBarbers[1].services[0].duration,
    timeSlot: fiveDaysAgo.toISOString(),
    status: "completed",
    createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: fiveDaysAgo,
  };
  const b4Res = await db.collection("bookings").insertOne(b4);

  await db.collection("reviews").insertOne({
    barberId: createdBarbers[1].id,
    bookingId: b4Res.insertedId.toString(),
    userId: createdCustomers[2].id,
    userName: createdCustomers[2].name,
    serviceName: b4.service,
    rating: 5,
    comment: "Super chic salon in Bandra. Arjun is an artist with the scissors. Loved the styling!",
    createdAt: fiveDaysAgo,
    updatedAt: fiveDaysAgo,
  });

  // Booking 5: Customer 4 (Siddharth) reviewed Barber 3 (Rohan in Delhi)
  const sixDaysAgo = new Date(now);
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
  sixDaysAgo.setHours(12, 0, 0, 0);

  const b5 = {
    userId: createdCustomers[3].id,
    customerName: createdCustomers[3].name,
    barberId: createdBarbers[2].id,
    barberName: createdBarbers[2].name,
    barberShopName: createdBarbers[2].shopName,
    serviceId: createdBarbers[2].services[0].id,
    service: createdBarbers[2].services[0].name,
    price: createdBarbers[2].services[0].price,
    duration: createdBarbers[2].services[0].duration,
    timeSlot: sixDaysAgo.toISOString(),
    status: "completed",
    createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
    updatedAt: sixDaysAgo,
  };
  const b5Res = await db.collection("bookings").insertOne(b5);

  await db.collection("reviews").insertOne({
    barberId: createdBarbers[2].id,
    bookingId: b5Res.insertedId.toString(),
    userId: createdCustomers[3].id,
    userName: createdCustomers[3].name,
    serviceName: b5.service,
    rating: 5,
    comment: "Top class gentleman's salon in CP. Professional staff and great relaxing ambiance.",
    createdAt: sixDaysAgo,
    updatedAt: sixDaysAgo,
  });

  // Booking 6: Customer 1 (Rahul) reviewed Barber 4 (Karan in Bengaluru)
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(17, 0, 0, 0);

  const b6 = {
    userId: createdCustomers[0].id,
    customerName: createdCustomers[0].name,
    barberId: createdBarbers[3].id,
    barberName: createdBarbers[3].name,
    barberShopName: createdBarbers[3].shopName,
    serviceId: createdBarbers[3].services[0].id,
    service: createdBarbers[3].services[0].name,
    price: createdBarbers[3].services[0].price,
    duration: createdBarbers[3].services[0].duration,
    timeSlot: sevenDaysAgo.toISOString(),
    status: "completed",
    createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    updatedAt: sevenDaysAgo,
  };
  const b6Res = await db.collection("bookings").insertOne(b6);

  await db.collection("reviews").insertOne({
    barberId: createdBarbers[3].id,
    bookingId: b6Res.insertedId.toString(),
    userId: createdCustomers[0].id,
    userName: createdCustomers[0].name,
    serviceName: b6.service,
    rating: 5,
    comment: "Classic vintage vibes in Indiranagar. The beard oil therapy and hot towel massage is unmatched!",
    createdAt: sevenDaysAgo,
    updatedAt: sevenDaysAgo,
  });

  console.log("✓ Created Sample Reviews & Ratings for All Barbers\n");
  console.log("==================================================");
  console.log("  SEED COMPLETED SUCCESSFULLY!");
  console.log("  ALL PASSWORDS: Password123!");
  console.log("==================================================");

  await client.close();
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
