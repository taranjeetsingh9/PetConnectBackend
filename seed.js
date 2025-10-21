require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Pet = require("./models/Pet");
const Organization = require("./models/Organization");

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected...");

    const hashedPassword = await bcrypt.hash("password123", 10);

    // ----------------------------
    // Create organizations
    // ----------------------------
    const orgs = [];

    const org1 = await Organization.findOneAndUpdate(
      { name: "Happy Paws Shelter" },
      {
        $setOnInsert: {
          type: "shelter",
          contact: {
            email: "contact@happypaws.org",
            phone: "123-456-7890",
            address: "123 Pet Lane, Toronto",
          },
        },
      },
      { upsert: true, new: true }
    );
    orgs.push(org1);

    const org2 = await Organization.findOneAndUpdate(
      { name: "Furry Friends Rescue" },
      {
        $setOnInsert: {
          type: "rescue",
          contact: {
            email: "contact@furryfriends.org",
            phone: "987-654-3210",
            address: "456 Animal Rd, Brampton",
          },
        },
      },
      { upsert: true, new: true }
    );
    orgs.push(org2);

    // ----------------------------
    // Create users
    // ----------------------------
    const usersData = [
      {
        email: "staff@pets.com",
        name: "Shelter Staff",
        role: "staff",
        organization: org1._id,
        location: "Toronto",
      },
      {
        email: "staff2@pets.com",
        name: "Rescue Staff",
        role: "staff",
        organization: org2._id,
        location: "Brampton",
      },
      {
        email: "adopter@pets.com",
        name: "John Adopter",
        role: "adopter",
        lifestyle: { activityLevel: "medium" },
        location: "Toronto",
      },
      {
        email: "vet@pets.com",
        name: "Dr. Vet",
        role: "vet",
        location: "Toronto",
      },
      {
        email: "trainer@pets.com",
        name: "Trainer Sam",
        role: "trainer",
        location: "Toronto",
      },
    ];

    for (const u of usersData) {
      await User.findOneAndUpdate(
        { email: u.email },
        { $setOnInsert: { ...u, password: hashedPassword } },
        { upsert: true, new: true }
      );
    }

    // ----------------------------
    // Create pets
    // ----------------------------
    const petsData = [
      {
        name: "Buddy",
        breed: "Golden Retriever",
        age: 3,
        gender: "Male",
        energyLevel: "high",
        temperament: ["Playful", "Friendly"],
        organization: org1._id,
        status: "Available",
        images: [{ url: "https://images.unsplash.com/photo-1558788353-f76d92427f16" }],
      },
      {
        name: "Mittens",
        breed: "Siamese Cat",
        age: 2,
        gender: "Female",
        energyLevel: "low",
        temperament: ["Calm", "Independent"],
        organization: org1._id,
        status: "Available",
        images: [{ url: "https://images.unsplash.com/photo-1592194996308-7b43878e84a6" }],
      },
      {
        name: "Max",
        breed: "German Shepherd",
        age: 4,
        gender: "Male",
        energyLevel: "high",
        temperament: ["Loyal", "Protective"],
        organization: org2._id,
        status: "Available",
        images: [{ url: "https://images.unsplash.com/photo-1560807707-8cc77767d783" }],
      },
      {
        name: "Luna",
        breed: "Persian Cat",
        age: 1,
        gender: "Female",
        energyLevel: "medium",
        temperament: ["Gentle", "Affectionate"],
        organization: org2._id,
        status: "Available",
        images: [{ url: "https://images.unsplash.com/photo-1618826411640-d6df5b6a5c3f" }],
      },
    ];

    for (const p of petsData) {
      await Pet.findOneAndUpdate(
        { name: p.name, organization: p.organization },
        { $setOnInsert: p },
        { upsert: true, new: true }
      );
    }

    console.log("🎉 Seed data added successfully! No previous data was erased.");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
