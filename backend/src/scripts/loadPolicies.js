import { policyService } from '../services/policy.service.js';

async function loadPolicies() {
    console.log('📚 Loading policies into Voy search index...');
    await policyService.reload();
    console.log('✅ Done! Policies loaded and embedded.');
    process.exit(0);
}

loadPolicies().catch((error) => {
    console.error('❌ Failed to load policies:', error);
    process.exit(1);
});
