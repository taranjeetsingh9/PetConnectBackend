require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Pet = require("./models/Pet");
const Organization = require("./models/Organization");
// Media model is no longer needed
// const Media = require("./models/Media");

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected...");

    // Clear old data
    await User.deleteMany();
    await Pet.deleteMany();
    await Organization.deleteMany();
    // await Media.deleteMany(); // Not needed

    // Create organization
    const org = await Organization.create({
      name: "Happy Paws Shelter",
      type: "shelter",
      contact: {
        email: "contact@happypaws.org",
        phone: "123-456-7890",
        address: "123 Pet Lane, Toronto",
      },
    });

    // Hash password
    const hashedPassword = await bcrypt.hash("password123", 10);

    // Users
    const staff = await User.create({
      email: "staff@pets.com",
      password: hashedPassword,
      name: "Shelter Staff",
      role: "staff",
      organization: org._id,
      location: "Toronto",
    });

    await User.create({
      email: "adopter@pets.com",
      password: hashedPassword,
      name: "John Adopter",
      role: "adopter",
      lifestyle: { activityLevel: "medium" },
      location: "Toronto",
    });

    await User.create({
      email: "vet@pets.com",
      password: hashedPassword,
      name: "Dr. Vet",
      role: "vet",
      location: "Toronto",
    });

    await User.create({
      email: "trainer@pets.com",
      password: hashedPassword,
      name: "Trainer Sam",
      role: "trainer",
      location: "Toronto",
    });

    // Pets data with real images
    const petsData = [
      {
        name: "Buddy",
        breed: "Golden Retriever",
        age: 3,
        gender: "Male",
        energyLevel: "high",
        temperament: ["Playful", "Friendly"],
        imageUrl: "https://images.unsplash.com/photo-1558788353-f76d92427f16",
      },
      {
        name: "Mittens",
        breed: "Siamese Cat",
        age: 2,
        gender: "Female",
        energyLevel: "low",
        temperament: ["Calm", "Independent"],
        imageUrl: "https://images.unsplash.com/photo-1592194996308-7b43878e84a6",
      },
      {
        name: "Max",
        breed: "German Shepherd",
        age: 4,
        gender: "Male",
        energyLevel: "high",
        temperament: ["Loyal", "Protective"],
        imageUrl: "https://images.unsplash.com/photo-1560807707-8cc77767d783",
      },
      {
        name: "Luna",
        breed: "Persian Cat",
        age: 1,
        gender: "Female",
        energyLevel: "medium",
        temperament: ["Gentle", "Affectionate"],
        imageUrl: "https://images.unsplash.com/photo-1618826411640-d6df5b6a5c3f",
      },
      {
        name: "Rocky",
        breed: "Bulldog",
        age: 5,
        gender: "Male",
        energyLevel: "low",
        temperament: ["Calm", "Lazy"],
        imageUrl: "https://images.unsplash.com/photo-1583511655826-05700d52f4a7",
      },
    ];

    // Insert pets directly with image URLs
    for (const petData of petsData) {
      await Pet.create({
        name: petData.name,
        breed: petData.breed,
        age: petData.age,
        gender: petData.gender,
        energyLevel: petData.energyLevel,
        temperament: petData.temperament,
        organization: org._id,
        status: "Available",
        images: [petData.imageUrl], // store image directly
      });
    }

    console.log("🎉 Database seeded successfully with inline pet images!");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
