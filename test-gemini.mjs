import { GoogleGenerativeAI } from '@google/generative-ai';

async function testKey() {
    const apiKey = 'AIzaSyDPFq4sys569GAGFBTw66L0OvLTFMy933lg';
    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent('Hi');
        console.log('Result:', result.response.text());
    } catch (e) {
        console.log('Error:', e.message);
    }
}

testKey();
