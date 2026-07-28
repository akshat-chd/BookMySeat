import { PrismaClient } from "../generated/client";
import { DEMO_EVENT_ID } from "@flashdrop/shared";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

// Using stable mock image data for guaranteed rendering
export const movies = [
  {
    id: DEMO_EVENT_ID, // Keeping DEMO_EVENT_ID for the main flash sale flow
    name: "Deadpool & Wolverine",
    description: "A listless Wade Wilson toils away in civilian life with his days as the morally flexible mercenary, Deadpool, behind him. But when his homeworld faces an existential threat, Wade must reluctantly suit-up again with an even more reluctant Wolverine.",
    price: 3500,
    genre: "Action",
    duration: 128,
    releaseDate: new Date("2024-07-24T19:00:00Z"),
    posterUrl: "https://image.tmdb.org/t/p/w800/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
    bannerUrl: "https://image.tmdb.org/t/p/original/yDHYTfA3R0jFYba16ZBRWUP1lNl.jpg"
  },
  {
    id: "dune-part-two",
    name: "Dune: Part Two",
    description: "Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the known universe, he endeavors to prevent a terrible future only he can foresee.",
    price: 4500,
    genre: "Sci-Fi",
    duration: 167,
    releaseDate: new Date("2024-02-27T14:30:00Z"),
    posterUrl: "https://image.tmdb.org/t/p/w800/1pdfLvkbY9ohJlCjQH2JGvwMEVA.jpg",
    bannerUrl: "https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg"
  },
  {
    id: "inside-out-2",
    name: "Inside Out 2",
    description: "Teenager Riley's mind headquarters is undergoing a sudden demolition to make room for something entirely unexpected: new Emotions! Joy, Sadness, Anger, Fear and Disgust, who’ve long been running a successful operation by all accounts, aren’t sure how to feel when Anxiety shows up.",
    price: 2500,
    genre: "Animation",
    duration: 96,
    releaseDate: new Date("2024-06-11T18:00:00Z"),
    posterUrl: "https://image.tmdb.org/t/p/w800/vpnVM9B6NMmQpWeZvzRxHXd2lN1.jpg",
    bannerUrl: "https://image.tmdb.org/t/p/original/stKGOm8UyhuLPR9sXLtqDteAKSQ.jpg"
  },
  {
    id: "oppenheimer",
    name: "Oppenheimer (IMAX 70mm)",
    description: "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II. Experience Christopher Nolan's epic in glorious IMAX 70mm format.",
    price: 5500,
    genre: "Drama",
    duration: 181,
    releaseDate: new Date("2023-07-19T20:00:00Z"),
    posterUrl: "https://image.tmdb.org/t/p/w800/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    bannerUrl: "https://image.tmdb.org/t/p/original/fm6KqXpk3M2HVveHwCrBRoOoA0i.jpg"
  },
  {
    id: "coldplay-tour",
    name: "Coldplay - Music of the Spheres Tour",
    description: "Experience Coldplay live in concert with the most immersive light, sound and pyrotechnic show ever staged. A truly celestial experience.",
    price: 35000,
    genre: "Concert",
    duration: 120,
    releaseDate: new Date("2025-10-03T20:30:00Z"),
    posterUrl: "https://image.tmdb.org/t/p/w800/c3gOty5oT12U152o7Bntm5740m7.jpg",
    bannerUrl: "https://image.tmdb.org/t/p/original/8vUuKzLq6qD5qL4Z05x0N37V0jT.jpg"
  },
  {
    id: "spiderman-spiderverse",
    name: "Spider-Man: Beyond the Spider-Verse",
    description: "Miles Morales returns for the ultimate chapter in the Spider-Verse saga. The web-slinging adventure that will change everything.",
    price: 2000,
    genre: "Animation",
    duration: 140,
    releaseDate: new Date("2025-09-20T16:00:00Z"),
    posterUrl: "https://image.tmdb.org/t/p/w800/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
    bannerUrl: "https://image.tmdb.org/t/p/original/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg"
  },
  {
    id: "furiosa",
    name: "Furiosa: A Mad Max Saga",
    description: "As the world fell, young Furiosa is snatched from the Green Place of Many Mothers and falls into the hands of a great Biker Horde led by the Warlord Dementus.",
    price: 2500,
    genre: "Action",
    duration: 148,
    releaseDate: new Date("2024-05-22T21:00:00Z"),
    posterUrl: "https://image.tmdb.org/t/p/w800/iADOJ8Zymht2JPMoy3R7xceZprc.jpg",
    bannerUrl: "https://image.tmdb.org/t/p/original/wNAhuOZ3Zf84jCIlrcI6JhgmY5q.jpg"
  },
  {
    id: "interstellar",
    name: "Interstellar - 10th Anniversary",
    description: "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.",
    price: 3000,
    genre: "Sci-Fi",
    duration: 169,
    releaseDate: new Date("2024-11-20T17:00:00Z"),
    posterUrl: "https://image.tmdb.org/t/p/w800/gEU2QlsUUQ1mniVf2ndzIG74U0.jpg",
    bannerUrl: "https://image.tmdb.org/t/p/original/xJHwPuEOpdjq3xqTpz7Z8oR8w6G.jpg"
  }
];

async function main() {
  for (const movie of movies) {
    await prisma.event.upsert({
      where: { id: movie.id },
      update: movie,
      create: movie
    });
  }

  // Seed 100 seats: 10 rows (A-J), 10 seats per row for EACH movie
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const seatData = [];
  
  for (const movie of movies) {
    for (const row of rows) {
      for (let i = 1; i <= 10; i++) {
        seatData.push({
          id: randomUUID(),
          eventId: movie.id,
          row,
          number: i,
          status: "AVAILABLE" as const
        });
      }
    }
  }

  // Clear existing seats for all movies
  await prisma.seat.deleteMany({});

  await prisma.seat.createMany({
    data: seatData
  });

  console.log(`✅ Seeded ${movies.length} events with ${seatData.length} seats`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
