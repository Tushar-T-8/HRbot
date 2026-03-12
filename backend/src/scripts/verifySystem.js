import { aiService } from '../services/ai.service.js';
import { policyService } from '../services/policy.service.js';

async function verifySystem() {
    console.log('--- 1. Testing Initialization & Document Loading ---');
    console.log('Waiting for Voy and Policy init...');
    await new Promise(r => setTimeout(r, 6000));
    
    const docs = policyService.getAllPolicies();
    let excelFound = false;
    for (const doc of docs) {
        if (doc.source.includes('Leave Tracker') && doc.text.includes('Mayank Thapliyal')) {
             excelFound = true;
             break;
        }
    }
    console.log(`✅ Excel Parsing & Chunking: ${excelFound ? 'PASS (Found Mayank in Excel)' : 'FAIL'}`);

    console.log('\n--- 2. Testing Voy Vector Search ---');
    let context = 'No context';
    try {
        context = await policyService.searchPolicies("What is Mayank Thapliyal's eligible leave balance?");
        if (context.includes('Mayank Thapliyal') && context.includes('12')) {
            console.log('✅ Voy Semantic Search: PASS (Retrieved correct Excel row)');
        } else {
            console.log('❌ Voy Semantic Search: FAIL (Did not find correct row in context)');
            console.log('Context returned:', context);
        }
    } catch(e) {
         console.log('❌ Voy Semantic Search: ERROR', e);
    }
    
    console.log('\n--- 3. Testing Context Injection & Llama 3 ---');
    const profile = {
        name: 'Mayank Thapliyal',
        role: 'EMPLOYEE',
        department: 'Engineering',
        leaveBalance: 12
    };
    
    try {
        console.log('Generating response using Llama 3 (this will take 10-20s)...');
        const stream = await aiService.generateResponseStream("Hi, what is my leave balance?", context, profile);
        let fullResponse = '';
        
        for await (const chunk of stream) {
            fullResponse += chunk;
        }
        
        console.log('\n--- AI Response ---');
        console.log(fullResponse);
        if (fullResponse.includes('12')) {
             console.log('\n✅ Context Injection & Llama 3: PASS (AI recognized the injected leave balance)');
        } else {
             console.log('\n❌ Context Injection & Llama 3: WARNING (AI did not explicitly mention the number 12)');
        }
    } catch(e) {
        console.log('\n❌ Llama 3 Generation: ERROR', e);
    }
    
    process.exit(0);
}

verifySystem();
