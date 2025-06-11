// noinspection JSUnusedGlobalSymbols

const fs = require("fs");
const path = require("path");
const { exec } = require("node:child_process"); // Node.js v16+ allows "node:" prefix for built-in modules
const { parse } = require("smol-toml");
const StreamZip = require("node-stream-zip");

// Native helper to replace shell.which
function which(cmd) {
    return new Promise((resolve) => {
        exec(`which ${cmd}`, (err, stdout) => {
            if (err || !stdout) {
                resolve(null);
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

// Import From Modrinth (.mrpack)
async function importFromModrinth(mrPath, outPath, packwizLoc, nameOverride) {
    return new Promise(async (resolve, reject) => {
        try {
            if (!packwizLoc) {
                console.log("no");
                packwizLoc = await which("packwiz");
                if (!packwizLoc) {
                    reject("No Packwiz exe found! Please Add to Path or declare manually...");
                    return;
                }
            }
            packwizLoc = path.resolve(packwizLoc.toString());

            if (!fs.existsSync(mrPath)) {
                reject("FILE_NOT_EXIST");
                return;
            }

            if (path.extname(mrPath) !== ".mrpack") {
                reject("NOT_VALID_MRPACK");
                return;
            }

            const zip = new StreamZip.async({ file: mrPath });
            const manifestRaw = await zip.entryData("modrinth.index.json");
            const manifest = JSON.parse(manifestRaw);
            const name_over = nameOverride || manifest.name;

            fs.mkdirSync(path.join(outPath, name_over), { recursive: true });

            const projectDeps = manifest.dependencies;
            const depKeys = Object.keys(projectDeps);
            let loader = "", loaderVersion = "", mcVersion = "";

            for (let key of depKeys) {
                if (key === "minecraft") {
                    mcVersion = projectDeps[key];
                } else {
                    loader = key;
                    loaderVersion = projectDeps[key];
                }
            }

            const newPackInfo = {
                author: "John Doe",
                loader,
                loaderVersion,
                minecraftVersion: mcVersion,
                name: name_over,
                version: 1,
            };

            await createPack(newPackInfo, path.join(outPath), packwizLoc);

            fs.mkdirSync(path.join(outPath, name_over, "overrides"), { recursive: true });
            await zip.extract("overrides", path.join(outPath, name_over, "overrides"));

            await runPackwiz(packwizLoc, "refresh", path.join(outPath, name_over));

            for (let file of manifest.files) {
                await runPackwiz(packwizLoc, `mr add ${file.downloads[0]} --yes`, path.join(outPath, name_over));
            }

            const packInfo = await getPackInfo(path.join(outPath, name_over));
            resolve(packInfo);
        } catch (e) {
            reject(e);
        }
    });
}

// Import From CurseForge (.zip)
async function importFromCurseforge(zipPath, outPath, packwizLoc, nameOverride) {
    return new Promise(async (resolve, reject) => {
        try {
            if (!packwizLoc) {
                packwizLoc = await which("packwiz");
                if (!packwizLoc) {
                    reject("No Packwiz exe found! Please Add to Path or declare manually");
                    return;
                }
            }
            packwizLoc = path.resolve(packwizLoc.toString());

            if (!fs.existsSync(zipPath)) {
                reject("FILE_NOT_EXIST");
                return;
            }

            if (path.extname(zipPath) !== ".zip") {
                reject("NOT_VALID_ZIP");
                return;
            }

            const name_over = nameOverride || path.parse(zipPath).name;
            fs.mkdirSync(path.join(outPath, name_over), { recursive: true });

            const command = `curseforge import ${zipPath}`;
            await runPackwiz(packwizLoc, command, path.join(outPath, name_over));

            const packInfo = await getPackInfo(path.join(outPath, name_over));
            resolve(packInfo);
        } catch (err) {
            reject(err);
        }
    });
}

async function getPackInfo(dir) {
    return new Promise((resolve, reject) => {
        try {
            const packFile = parse(fs.readFileSync(path.join(dir, "pack.toml")).toString());
            resolve(packFile);
        } catch (err) {
            reject(err);
        }
    });
}

async function getPackVersion(name, dir) {
    try {
        const packFile = parse(fs.readFileSync(path.join(dir, name, "pack.toml")).toString());
        return packFile.version;
    } catch (err) {
        return false;
    }
}

async function createPack(fileData, dir, packwizLoc) {
    return new Promise(async (resolve, reject) => {
        if (!packwizLoc) {
            packwizLoc = await which("packwiz");
            if (!packwizLoc) {
                reject("No Packwiz exe found! Please Add to Path or declare manually");
                return;
            }
        }

        const packPath = path.join(dir, fileData.name);
        fs.mkdirSync(packPath, { recursive: true });
        packwizLoc = path.resolve(packwizLoc.toString());

        const loaderVer = fileData.loaderVersion
            ? `--${fileData.loader}-version ${fileData.loaderVersion}`
            : `--${fileData.loader}-latest`;

        const command = `init -r --author ${fileData.author.replace(/\s/g, "")} ${loaderVer} --mc-version ${fileData.minecraftVersion} --modloader ${fileData.loader} --name ${fileData.name.replace(/\s/g, "")} --version ${fileData.version}`;

        await runPackwiz(packwizLoc, command, packPath, true);

        if (fileData.mods) {
            for (let mod of fileData.mods) {
                const modCmd = `${mod.source} add ${mod.slug} --yes`;
                await runPackwiz(packwizLoc, modCmd, packPath, true);
            }
        }

        resolve(true);
    });
}

async function getModList(packFolder) {
    return new Promise((resolve) => {
        try {
            const modsDir = path.join(packFolder, "mods");
            if (fs.existsSync(modsDir)) {
                const files = fs.readdirSync(modsDir);
                const mods = files.map((file) => {
                    const fileData = parse(fs.readFileSync(path.join(modsDir, file)).toString());
                    return fileData.filename;
                });
                resolve(mods);
            } else {
                resolve([]);
            }
        } catch (err) {
            resolve(["notamod.jar"]);
        }
    });
}

// Packwiz Runner
async function runPackwiz(loc, command, dir, printOut = false) {
    return new Promise((resolve) => {
        fs.mkdirSync(dir, { recursive: true });
        const child = exec(`cd ${dir} && ${loc} ${command}`);
        child.stdout.on("data", (data) => {
            if (printOut) console.log(data.trim());
        });
        child.stderr.on("data", (data) => {
            if (printOut) console.log(data.trim());
        });
        child.on("close", (code) => resolve(code));
    });
}

module.exports = {
    importFromCurseforge,
    getPackVersion,
    getModList,
    createPack,
    importFromModrinth,
};
