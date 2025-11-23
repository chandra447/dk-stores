// Simple script to create a test admin user
import { convex } from 'convex/client';

const client = convex('https://precise-pig-499.convex.cloud');

async function createTestUser() {
  try {
    console.log('Creating test admin user...');
    
    // Create a test admin user
    const result = await client.mutation('auth:createAdmin', {
      email: 'admin@test.com',
      password: 'admin123',
      name: 'Test Admin'
    });
    
    console.log('Result:', result);
    
    if (result.success) {
      console.log('✅ Test admin user created successfully!');
      console.log('Email: admin@test.com');
      console.log('Password: admin123');
    } else {
      console.log('❌ Failed to create test user:', result);
    }
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

createTestUser();