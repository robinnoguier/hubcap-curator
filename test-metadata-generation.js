/**
 * Test script for subtopic metadata generation
 * Run with: node test-metadata-generation.js
 */

const API_BASE = 'http://localhost:3000';

const testCases = [
  {
    name: 'Fighter Test (Person)',
    data: {
      hubName: 'Combat Sports',
      hubDescription: 'Professional fighting and martial arts',
      topicName: 'UFC Fighters',
      topicDescription: 'Mixed martial arts fighters in the Ultimate Fighting Championship',
      subtopicDescription: 'top lightweight division fighters',
      locale: { region: 'US', language: 'en' }
    }
  },
  {
    name: 'Stadium Test (Location)',
    data: {
      hubName: 'Football',
      hubDescription: 'Soccer stadiums and venues around the world',
      topicName: 'European Stadiums',
      topicDescription: 'Major football stadiums in Europe',
      subtopicDescription: 'all stadiums in Europe above 65k capacity',
      locale: { region: 'DE', language: 'en' }
    }
  },
  {
    name: 'Product Test',
    data: {
      hubName: 'Technology',
      hubDescription: 'Consumer electronics and gadgets',
      topicName: 'Smartphones',
      topicDescription: 'Mobile phones and devices',
      subtopicDescription: 'flagship smartphones released in 2024',
      locale: { region: 'US', language: 'en' }
    }
  },
  {
    name: 'Event Test',
    data: {
      hubName: 'Sports',
      hubDescription: 'International sporting competitions',
      topicName: 'Olympics',
      topicDescription: '2024 Summer Olympics events',
      subtopicDescription: 'individual Olympic events in athletics',
      locale: { region: 'FR', language: 'en' }
    }
  }
];

async function testEndpoint(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`Request: ${testCase.data.subtopicDescription}`);
  
  try {
    const response = await fetch(`${API_BASE}/api/subtopics/generate-with-metadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCase.data),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    console.log(`✅ Inferred Type: ${result.inferred_type} (confidence: ${result.confidence})`);
    console.log(`📋 Schema Fields: ${result.schema.fields.length} fields`);
    console.log(`🎯 Generated: ${result.subtopics.length} subtopics`);
    
    if (result.subtopics.length > 0) {
      const firstSubtopic = result.subtopics[0];
      console.log(`📝 Example: "${firstSubtopic.name}"`);
      console.log(`   Metadata fields: ${Object.keys(firstSubtopic.metadata).length}`);
      if (Object.keys(firstSubtopic.metadata).length > 0) {
        console.log(`   Sample data:`, JSON.stringify(firstSubtopic.metadata, null, 2));
      }
    }
    
    console.log(`💭 Type Reason: ${result.rationales.type_reason}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Subtopic Metadata Generation Tests\n');
  console.log(`Target: ${API_BASE}`);
  
  let passed = 0;
  let total = testCases.length;
  
  for (const testCase of testCases) {
    const success = await testEndpoint(testCase);
    if (success) passed++;
  }
  
  console.log(`\n📊 Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed');
    process.exit(1);
  }
}

// Check if we're running in a browser or Node.js environment
if (typeof window === 'undefined') {
  // Node.js environment
  if (typeof fetch === 'undefined') {
    console.log('Installing fetch for Node.js...');
    import('node-fetch').then((fetch) => {
      global.fetch = fetch.default;
      runTests();
    }).catch(() => {
      console.error('Please install node-fetch: npm install node-fetch');
      process.exit(1);
    });
  } else {
    runTests();
  }
} else {
  // Browser environment
  runTests();
}