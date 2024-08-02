const Humanoid = require("humanoid-js"); 
const HEADER = "https://www.curseforge.com/api/v1/mods/search";
const humanoid = new Humanoid();
var sortFields = {
    'Relevancy':1,
    'Popularity':2,
    'Latest update':3,
    'Creation Date':5,
    'Total Downloads':6,
    'A-Z':7
};

var loaders = {
    'Forge':1,
    'Fabric':4,
    'Quilt':5,
    'NeoForge':6
}


async function searchCurse(text,filter,loader,version) {
    return new Promise(async (resolve, reject) => {
        if (!text) {
            reject('Search Field Required');
        };
        if (!filter) {
            filter = 1
        };
        if (!Number(filter)) {
            if (sortFields[filter]) {
                filter = sortFields[filter];
            } else {
                reject('Invalid Sort Field');
                return;
            };
        };
        var args = `gameId=432&index=0&filterText=${text}&pageSize=10&sortField=${filter}`;
        if (loader) {
            if (!Number(loader)) {
                if (loaders[loader]) {
                    loader = loaders[loader];
                    console.log(loader)
                } else {
                    reject('Invalid Loader');
                    return;
                };
            };
            args += `&gameFlavors[0]=${loader}`;
        };
        if (version) {
            args += `&gameVersion=${version}`;
        }
        const res = await humanoid.get(`${HEADER}?${args}`);
        var parsedData = JSON.parse(res.body).data;
        resolve(parsedData)
    });
};


module.exports = { searchCurse }