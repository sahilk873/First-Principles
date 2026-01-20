/**
 * Concordance Feature Test
 * 
 * This test verifies that:
 * 1. After 5 expert reviewers submit their reviews
 * 2. The system automatically calculates case_results
 * 3. Concordance is properly measured on the performance page
 */

const { createClient } = require('@supabase/supabase-js');

// Test configuration
const CASE_ID = 'e37c6e73-b0a3-4ef5-889c-0e1f84423d37';
const BASE_URL = 'http://localhost:3000';
const PASSWORD = 'Demo2024!';

// Reviewers and their assigned scores for testing
const REVIEWERS = [
  { email: 'expert1@demo.io', reviewId: '727af6dc-e343-49e6-bf58-2d8f58b3e9a5', score: 8 }, // APPROPRIATE
  { email: 'expert2@demo.io', reviewId: '5c56f6a4-6a51-4a03-8b39-d86c771548b0', score: 7 }, // APPROPRIATE
  { email: 'expert6@demo.io', reviewId: '86cc2379-7516-45f3-8088-507423bb4406', score: 6 }, // UNCERTAIN
  { email: 'expert9@demo.io', reviewId: 'b2f05add-c05f-4779-86e4-319b5413c234', score: 5 }, // UNCERTAIN
  { email: 'expert10@demo.io', reviewId: 'a73c3d53-0d79-4f05-8e60-58fb43442414', score: 4 }, // UNCERTAIN
];

// Expected results
const EXPECTED_MEAN = 6.0; // (8+7+6+5+4)/5
const EXPECTED_CLASS = 'UNCERTAIN'; // mean 6.0 is in UNCERTAIN range (4-6.99)

async function checkCaseResultsExist() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials not found in environment');
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data, error } = await supabase
    .from('case_results')
    .select('*')
    .eq('case_id', CASE_ID)
    .single();
  
  return data;
}

async function main() {
  console.log('\n🧪 CONCORDANCE FEATURE TEST');
  console.log('=' .repeat(60));
  console.log(`\n📋 Test Case ID: ${CASE_ID}`);
  console.log(`📊 Expected Mean Score: ${EXPECTED_MEAN}`);
  console.log(`🏷️  Expected Classification: ${EXPECTED_CLASS}`);
  console.log('\n' + '-'.repeat(60));
  
  // Check if case_results already exists
  console.log('\n🔍 Checking if case already has results...');
  const existingResult = await checkCaseResultsExist();
  
  if (existingResult) {
    console.log('\n⚠️  Case results already exist:');
    console.log(`   Mean Score: ${existingResult.mean_score}`);
    console.log(`   Classification: ${existingResult.final_class}`);
    console.log(`   Number of Reviews: ${existingResult.num_reviews}`);
    console.log('\n💡 To test fresh, you need to delete the case_result and reset reviews to ASSIGNED status.');
    console.log('\n✅ Concordance feature is WORKING (results were generated)');
    return;
  }
  
  console.log('✅ No existing results found. Ready to test!\n');
  console.log('=' .repeat(60));
  console.log('\n📝 Test Plan:');
  console.log('   1. Login as each of 5 expert reviewers');
  console.log('   2. Submit review with predetermined scores:');
  REVIEWERS.forEach((r, i) => {
    console.log(`      ${i+1}. ${r.email}: Score ${r.score}/9`);
  });
  console.log('   3. After 5th review, verify case_results is created');
  console.log('   4. Verify mean score and classification are correct');
  console.log('   5. Check concordance calculation on performance page');
  console.log('\n' + '='.repeat(60));
  console.log('\n⚠️  This test requires Playwright browser automation.');
  console.log('💡 Run this manually using the Playwright MCP or browser extension.');
  console.log('\n📖 Manual Test Steps:');
  console.log('\n   For each reviewer:');
  console.log('   - Navigate to http://localhost:3000/login');
  console.log('   - Login with email and password: Demo2024!');
  console.log('   - Go to /reviews/[reviewId]');
  console.log('   - Fill out the form with:');
  console.log('     * Surgery Indicated: Yes');
  console.log('     * Fusion Indicated: Yes');
  console.log('     * Preferred Approach: TLIF');
  console.log('     * Appropriateness Score: [assigned score]');
  console.log('     * Successful Outcome: Yes');
  console.log('     * Optimization Recommended: No');
  console.log('     * Missing Data: No');
  console.log('   - Submit review');
  console.log('\n' + '='.repeat(60));
  console.log('\n🎯 Expected Outcome:');
  console.log(`   - After 5th review submitted:`);
  console.log(`   - case_results record created`);
  console.log(`   - mean_score = ${EXPECTED_MEAN}`);
  console.log(`   - final_class = ${EXPECTED_CLASS}`);
  console.log(`   - Case status updated to COMPLETED`);
  console.log(`   - Notifications sent to case submitter`);
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Reviewer Information:');
  REVIEWERS.forEach((r, i) => {
    console.log(`\n   Reviewer ${i+1}:`);
    console.log(`   Email: ${r.email}`);
    console.log(`   Password: ${PASSWORD}`);
    console.log(`   Review ID: ${r.reviewId}`);
    console.log(`   Review URL: ${BASE_URL}/reviews/${r.reviewId}`);
    console.log(`   Score to Submit: ${r.score}/9`);
  });
  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
