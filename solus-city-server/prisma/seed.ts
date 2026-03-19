import { seedDatabase } from "../src/lib/seedData";

seedDatabase()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
