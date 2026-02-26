import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const user1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      username: 'johndoe',
      password: hashedPassword,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      email: 'jane@example.com',
      username: 'janedoe',
      password: hashedPassword,
    },
  });

  // Create sample posts
  await prisma.post.createMany({
    data: [
      {
        authorId: user1.id,
        content: 'Hello world! This is my first post on Mini Social Feed.',
      },
      {
        authorId: user1.id,
        content: 'Just finished setting up my new development environment. Feeling productive! 🚀',
      },
      {
        authorId: user2.id,
        content: 'Anyone else excited about the new React Native features? The performance improvements are amazing!',
      },
      {
        authorId: user2.id,
        content: 'Working on a cool new project. Will share more details soon!',
      },
    ],
  });

  // Add some likes and comments
  const posts = await prisma.post.findMany();

  await prisma.like.create({
    data: {
      userId: user2.id,
      postId: posts[0].id,
    },
  });

  await prisma.comment.create({
    data: {
      userId: user2.id,
      postId: posts[0].id,
      content: 'Welcome to the platform! Great first post!',
    },
  });

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
