const fs = require('fs');
const shell = require('shelljs');
const { exec } = require('node:child_process');
let toml = require('toml');
const path = require('path');
const { packwizLogger } = require('./logger');
const StreamZip = require('node-stream-zip');

async function createPack(fileData,dir,packwizLoc) {
    if (!packwizLoc) {
        if (!shell.which('packwiz')) {
            reject('No Packwiz exe found! Please Add to Path or declare manually')
            return;
        } else {
            packwizLoc = shell.which('packwiz');
        };
    };
    shell.mkdir('-p', path.join(dir, fileData.name));
    packwizLoc = path.resolve(packwizLoc.toString());


    
    let command = `init -r --author ${fileData.author} --${fileData.loader}-version ${fileData.loaderVersion} --mc-version ${fileData.minecraftVersion} --modloader ${fileData.loader} --name ${fileData.name} --version ${fileData.version}`;
    const create = await runPackwiz(packwizLoc, command, path.join(dir, fileData.name));
    let modArray = fileData.mods;
    for (idx in modArray) {
        let modC = `${modArray[idx].source} add ${modArray[idx].slug} --yes`;
        let addMod = await runPackwiz(packwizLoc, modC, path.join(dir, fileData.name));
    };
};


async function getModList(packFolder) {
    return new Promise(async (resolve, reject) => {
        try {
            if (fs.existsSync(packFolder)) {
                let folderFiles = fs.readdirSync(packFolder);
                let mods  = [];
                for (idx in folderFiles) {
                    let fileName = toml.parse(fs.readFileSync(path.join(packFolder,folderFiles[idx]))).filename;
                    mods.push(fileName);
                };
                resolve(mods);
            }
        } catch (err) {
            reject(err)
        }
    })
};

async function importFromCurseforge(zipPath,dir,packwizLoc,outputJSON,nameOveride) {
    return new Promise(async (resolve, reject) => {
        try {
            if (!outputJSON) {
                outputJSON = false;
            };
        
            if (!packwizLoc) {
                if (!shell.which('packwiz')) {
                    reject('No Packwiz exe found! Please Add to Path or declare manually')
                    return;
                } else {
                    packwizLoc = shell.which('packwiz');
                };
            };
            packwizLoc = path.resolve(packwizLoc.toString());
            // Check if zip exists
        
            if (!fs.existsSync(zipPath)) {
                reject('FILENOTEXIST');
            };

            if (path.extname(zipPath) != '.zip') {
                reject('NOTVALID');
            };



            const manifest = new StreamZip.async({ file: zipPath });
            const manifestDataBuffer = await manifest.entryData('manifest.json');
            const manifestFile = JSON.parse(manifestDataBuffer);

            if (nameOveride) {
                name_over = nameOveride;
            } else {
                name_over = manifestFile.name
            }
            
            let mods = new Array();
            let modList = manifestFile.files;
            for (idx in modList) {
                let newObj = {
                    source: 'cf',
                    slug: `--addon-id ${modList[idx].projectID} --file-id ${modList[idx].fileID}`
                };
                mods.push(newObj);
            };


            let newModPack = {
                name:name_over,
                friendly:manifestFile.name,
                version:1,
                minecraftVersion:manifestFile.minecraft.version,
                loader:manifestFile.minecraft.modLoaders[0].id.split("-")[0],
                loaderVersion:manifestFile.minecraft.modLoaders[0].id.split("-")[1],
                mods:mods
            };




            shell.mkdir('-p', path.join(dir,name_over));
            let command = `curseforge import ${zipPath}`;
            await runPackwiz(packwizLoc,command,path.join(dir,name_over));

            if (outputJSON) {
                resolve(newModPack)
            } else {
                resolve(true);
            };
        } catch (err) {
            reject(err);
        }
    })


}

async function getPackVersion(name,dir) {
    try {
        let packFile = toml.parse(fs.readFileSync(path.join(dir, name,'pack.toml')));
        let packVersion = Number(packFile.version)
        return packVersion;
    } catch (err) {
        return false
    }

}

async function runPackwiz(loc, command, dir) {
    return new Promise(async (resolve, reject) => {
        let child = exec(`cd ${dir} && ${loc} ${command}`);
        child.stdout.on('data', function (data) {
            packwizLogger.info(data);
        });
        child.stderr.on('data', function (data) {
            packwizLogger.error(data);
        });
        child.on('close', function (code) {
            packwizLogger.info(`Exited with Code ${code}`);
            resolve(code)
        });
    })
};


module.exports = { runPackwiz,createPack, getPackVersion, getModList, importFromCurseforge }