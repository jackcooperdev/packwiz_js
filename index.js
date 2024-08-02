const fs = require('fs');
const shell = require('shelljs');
const { exec } = require('node:child_process');
var toml = require('toml');
const path = require('path')


//(Client --> "Server")
async function createToFile(name, version, loader, lVersion, modArray, dir, packwizLoc) {
    return new Promise(async (resolve, reject) => {
        // Create packwiz to file
        if (!packwizLoc) {
            if (!shell.which('packwiz')) {
                reject('No Packwiz Installed! Please Add to Path or declare manually')
                return;
            } else {
                packwizLoc = shell.which('packwiz');
            };
        };
        shell.mkdir('-p', path.join(dir, name));
        packwizLoc = path.resolve(packwizLoc.toString());
        if (!lVersion) {
            loaderStr = `${loader}-latest`
        } else {
            loaderStr = `${loader}-version ${lVersion}`;
        }
        var command = `init --author CauldronMC --${loaderStr} --mc-version ${version} --modloader ${loader} --name ${name} --version 1.0.0`;
        console.log(dir)
        console.log(command)
        const create = await runPackwiz(packwizLoc, command, path.join(dir, name));
        for (idx in modArray) {
            var modC = `${modArray[idx].source} add ${modArray[idx].slug}`;
            var addMod = await runPackwiz(packwizLoc, modC, path.join(dir, name));
        };
        var packFile = toml.parse(fs.readFileSync(path.join(dir, name,'pack.toml')));
        var exportJSON = {
            name:name,
            author:packFile.author,
            versionInfo:packFile.versions,
            mods:modArray
        };
        resolve(exportJSON);
    });
};

//("Server" --> Client)

async function fileToPack(fileData,dir,packwizLoc) {
    if (!packwizLoc) {
        if (!shell.which('packwiz')) {
            reject('No Packwiz Installed! Please Add to Path or declare manually')
            return;
        } else {
            packwizLoc = shell.which('packwiz');
        };
    };
    shell.mkdir('-p', path.join(dir, fileData.name));
    packwizLoc = path.resolve(packwizLoc.toString());

    var command = `init --author CauldronMC --${Object.keys(fileData.versionInfo)[0]}-version ${fileData.versionInfo[Object.keys(fileData.versionInfo)[0]]} --mc-version ${fileData.versionInfo.minecraft} --modloader ${Object.keys(fileData.versionInfo)[0]} --name ${fileData.name} --version 1.0.0`;
    const create = await runPackwiz(packwizLoc, command, path.join(dir, fileData.name));
    var modArray = fileData.mods;
    for (idx in modArray) {
        var modC = `${modArray[idx].source} add ${modArray[idx].slug}`;
        var addMod = await runPackwiz(packwizLoc, modC, path.join(dir, fileData.name));
    };
};

async function runPackwiz(loc, command, dir) {
    return new Promise(async (resolve, reject) => {
        var child = exec(`cd ${dir} && ${loc} ${command}`);
        child.stdout.on('data', function (data) {
            console.log('stdout: ' + data);
        });
        child.stderr.on('data', function (data) {
            //console.log(data)
        });
        child.on('close', function (code) {
            resolve(code)
        });
    })
}


module.exports = { runPackwiz,fileToPack,createToFile }