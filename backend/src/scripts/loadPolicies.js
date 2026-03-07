import { policyService } from '../services/policy.service.js';

async function loadPolicies() {
    console.log('📚 Loading policies into ChromaDB...');
    await policyService.loadPoliciesIntoChroma();
    console.log('✅ Done!');
    process.exit(0);
}

loadPolicies().catch((error) => {
    console.error('❌ Failed to load policies:', error);
    process.exit(1);
});
