// noinspection JSUnusedGlobalSymbols

import fs from "fs";

import shell from "shelljs";
import { exec } from "node:child_process";
import path from "path";
import { parse } from "smol-toml";
import StreamZip from "node-stream-zip";

// Import From Modrinth (.mrpack)

async function importFromModrinth(mrPath, outPath, packwizLoc, nameOverride) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!packwizLoc) {
        console.log("no");
        if (!shell.which("packwiz")) {
          reject(
            "No Packwiz exe found! Please Add to Path or declare manually...",
          );
          return;
        } else {
          packwizLoc = shell.which("packwiz");
        }
      }
      packwizLoc = path.resolve(packwizLoc.toString());
      // Check if zip exists
      if (!fs.existsSync(mrPath)) {
        reject("FILE_NOT_EXIST");
      }

      // Check if is ZIP
      if (path.extname(mrPath) !== ".mrpack") {
        reject("NOT_VALID_MRPACK");
      }

      const zip = new StreamZip.async({ file: mrPath });
      const manifestRaw = await zip.entryData("modrinth.index.json");
      let manifest = JSON.parse(manifestRaw);
      let name_over;
      if (nameOverride) {
        name_over = nameOverride;
      } else {
        name_over = manifest.name;
      }
      shell.mkdir("-p", path.join(outPath, name_over));
      // Create Pack Info

      let projectDeps = manifest.dependencies;
      let depKeys = Object.keys(projectDeps);
      let loader = "";
      let loaderVersion = "";
      let mcVersion = "";

      for (let idx in depKeys) {
        if (depKeys[idx] === "minecraft") {
          mcVersion = projectDeps[depKeys[idx]];
        } else {
          loader = depKeys[idx];
          loaderVersion = projectDeps[depKeys[idx]];
        }
      }

      let newPackInfo = {
        author: "John Doe",
        loader: loader,
        loaderVersion: loaderVersion,
        minecraftVersion: mcVersion,
        name: name_over,
        version: 1,
      };

      //Create Pack
      await createPack(newPackInfo, path.join(outPath), packwizLoc);

      // Extract Overrides
      shell.mkdir("-p", path.join(outPath, name_over, "overrides"));
      await zip.extract(
        "overrides",
        path.join(outPath, name_over, "overrides"),
      );
      // Sync Index
      await runPackwiz(packwizLoc, "refresh", path.join(outPath, name_over));

      for (let idx in manifest.files) {
        await runPackwiz(
          packwizLoc,
          `mr add ${manifest.files[idx].downloads[0]} --yes`,
          path.join(outPath, name_over),
        );
      }

      let packInfo = await getPackInfo(path.join(outPath, name_over));
      resolve(packInfo);
    } catch (e) {
      reject(e);
    }
  });
}

// Import From CurseForge (.zip)
async function importFromCurseforge(
  zipPath,
  outPath,
  packwizLoc,
  nameOverride,
) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!packwizLoc) {
        if (!shell.which("packwiz")) {
          reject(
            "No Packwiz exe found! Please Add to Path or declare manually",
          );
          return;
        } else {
          packwizLoc = shell.which("packwiz");
        }
      }
      packwizLoc = path.resolve(packwizLoc.toString());
      // Check if zip exists

      if (!fs.existsSync(zipPath)) {
        reject("FILE_NOT_EXIST");
      }

      // Check if is ZIP
      if (path.extname(zipPath) !== ".zip") {
        reject("NOT_VALID_ZIP");
      }
      let name_over;
      if (nameOverride) {
        name_over = nameOverride;
      } else {
        name_over = path.parse(zipPath).name;
      }
      shell.mkdir("-p", path.join(outPath, name_over));
      let command = `curseforge import ${zipPath}`;
      await runPackwiz(packwizLoc, command, path.join(outPath, name_over));
      let packInfo = await getPackInfo(path.join(outPath, name_over));
      resolve(packInfo);
    } catch (err) {
      reject(err);
    }
  });
}

async function getPackInfo(dir) {
  return new Promise(async (resolve, reject) => {
    try {
      let packFile = parse(
        fs.readFileSync(path.join(dir, "pack.toml")).toString(),
      );
      resolve(packFile);
    } catch (err) {
      reject(err);
    }
  });
}

async function getPackVersion(name, dir) {
  try {
    let packFile = parse(
      fs.readFileSync(path.join(dir, name, "pack.toml")).toString(),
    );
    return packFile.version;
  } catch (err) {
    return false;
  }
}

async function createPack(fileData, dir, packwizLoc) {
  return new Promise(async (resolve, reject) => {
    if (!packwizLoc) {
      if (!shell.which("packwiz")) {
        reject("No Packwiz exe found! Please Add to Path or declare manually");
        return;
      } else {
        packwizLoc = shell.which("packwiz");
      }
    }
    shell.mkdir("-p", path.join(dir, fileData.name));
    packwizLoc = path.resolve(packwizLoc.toString());

    if (!fileData.loaderVersion) {
      fileData.loaderVersion = `--${fileData.loader}-latest`;
    } else {
      fileData.loaderVersion = `--${fileData.loader}-version ${fileData.loaderVersion}`;
    }

    let command = `init -r --author ${fileData.author.split(" ").join("")} ${fileData.loaderVersion} --mc-version ${fileData.minecraftVersion} --modloader ${fileData.loader} --name ${fileData.name.split(" ").join("")} --version ${fileData.version}`;
    console.log(command);
    await runPackwiz(packwizLoc, command, path.join(dir, fileData.name), true);
    let modArray = fileData.mods;
    for (let idx in modArray) {
      let modC = `${modArray[idx].source} add ${modArray[idx].slug} --yes`;
      await runPackwiz(packwizLoc, modC, path.join(dir, fileData.name), true);
    }
    resolve(true);
  });
}

async function getModList(packFolder) {
  return new Promise(async (resolve, reject) => {
    try {
      if (fs.existsSync(packFolder)) {
        packFolder = path.join(packFolder, "mods");
        let folderFiles = fs.readdirSync(packFolder);
        let mods = [];
        for (let idx in folderFiles) {
          let fileName = parse(
            fs.readFileSync(path.join(packFolder, folderFiles[idx])).toString(),
          ).filename;
          mods.push(fileName);
        }
        resolve(mods);
      }
    } catch (err) {
      reject(err);
    }
  });
}

// Packwiz Runner
async function runPackwiz(loc, command, dir, printOut) {
  return new Promise(async (resolve) => {
    fs.mkdirSync(dir, { recursive: true });
    let child = exec(`cd ${dir} && ${loc} ${command}`);
    child.stdout.on("data", function (data) {
      if (printOut) {
        console.log(data.replace(/(\r\n|\n|\r)/gm, ""));
      }
    });
    child.stderr.on("data", function (data) {
      if (printOut) {
        console.log(data.replace(/(\r\n|\n|\r)/gm, ""));
      }
    });
    child.on("close", function (code) {
      resolve(code);
    });
  });
}

export {
  importFromCurseforge,
  getPackVersion,
  getModList,
  createPack,
  importFromModrinth,
};
