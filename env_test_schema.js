const fs = require('fs');

const url = "https://script.google.com/macros/s/AKfycbxG1WbTWNXhTEcZLwp5eqP6RCcuVXjCQIki5V1TXAUDPqRLNAlfpT_U3iThqMR5X2A1/exec";

async function fetchFromGAS(action) {
    try {
        const res = await fetch(`${url}?action=${action}`);
        return await res.json();
    } catch (e) {
        return { error: e.message };
    }
}

async function analyze() {
    const actions = ['getMenu', 'getOrders', 'getSoTay', 'getDashboard'];
    const results = {};
    for (const action of actions) {
        const result = await fetchFromGAS(action);
        if (result.status === 'success' && result.data) {
            results[action] = Array.isArray(result.data) && result.data.length > 0 
                ? Object.keys(result.data[0]) 
                : result.data;
        } else {
            results[action] = result;
        }
    }
    fs.writeFileSync('schema_output.json', JSON.stringify(results, null, 2));
}

analyze();
