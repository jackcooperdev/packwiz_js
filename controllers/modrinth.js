const CloudflareBypasser = require('cloudflare-bypasser');

let cf = new CloudflareBypasser();
let acceptableIndexes = ["relevance","downloads","follows","newest","updated"]

async function searchModrinth(text,filter,loader,version) {
    return new Promise(async (resolve, reject) => {
        if (!text) {
            reject('Search Field Required');
        }

        let url = `https://api.modrinth.com/v2/search?query=${text}`;

        let facets = [];
        if (loader) {
            facets.push([`categories:${loader.toLowerCase()}`]);
        }
        if (version) {
            facets.push([`versions:${version}`]);
        }
        facets.push([`project_type:mod`]);

        url += `&facets=${JSON.stringify(facets)}`;
        if (filter) {
            if (acceptableIndexes.includes(filter)) {
                url += `&index=${filter}`
            } else {
                reject('Invalid Filter')
            }
        }
        const res = await cf.request(url);
        let parsedData = JSON.parse(res.body);
        resolve(parsedData)
        
    })
}

module.exports = {searchModrinth}