# packwiz_js

> This Documentation is correct for version [1.0.5](https://github.com/jackcooperdev/packwiz_js/releases/tag/1.0.3) of
> packwiz_js

## What does this do?

Packwiz is a command line tool for creating Minecraft modpacks.
Instead of managing JAR files directly, packwiz creates TOML metadata files.
Packwiz_js allows for packwiz to be used in Node.js projects.

## License Information

This project is licensed under [GPL 3.0](https://choosealicense.com/licenses/gpl-3.0/) so please make sure that your
project follows the license guidelines.

## Setup

1. Download packwiz [here](https://packwiz.infra.link/) and either place in system path or take note of the path.
2. Install the package with the command below.

```
npm i @jackcooperdev/packwiz_js
```

## Functions

### createPack (fileData, dir, packwizLoc)

This function creates a modpack from the data provided into the specified directory.

It takes the following parameters

+ `fileData` - Object comprising the data required for the creation of the pack. The format can be found below
+ `dir`  - The directory where the modpack will be created.
  This should not include the name of the modpack
+ `packwizLoc` - The location of the packwiz executable. This can be left blank if packwiz is on the path.

> Example File Data

```json
{
  "name": "ModpackName",
  "loader": "Mod Loader",
  "version": "Pack Version",
  "minecraftVersion": "Minecraft Version",
  "loaderVersion": "Version of Modloader",
  "author": "Author of Modpack",
  "mods" : [{
    "source": "cf or mr",
    "slug": "mod slug"
  }]
}
```

This will output true on successful completion.

### getModList (packFolder)

This function outputs an array of mods in the queried modpack

It takes the following parameters

+ `packFolder` - Modpack Folder Location

### getPackInfo (packFolder)

This function outputs information about the selected pack.

It takes the following parameters

+ `packFolder` - Modpack Folder Location

### importFromCurseForge (zipPath, outPath, packWizLoc, nameOverride)

This function takes a curseforge modpack (.zip) and converts it into a packwiz modpack and returns the pack info.

It takes the following parameters

+ `zipPath` - Path of the curseforge modpack.
+ `outPath` - Output Path
+ `packwizLoc` - The location of the packwiz executable. This can be left blank if packwiz is on the path.
+ `nameOverride` - Override Name of modpack

### importFromModrinth (mrPath, outPath, packWizLoc, nameOverride)

This function takes a modrinth modpack (.mr) and converts it into a packwiz modpack and returns the pack info.

It takes the following parameters

+ `mrPath` - Path of the Modrinth modpack.
+ `outPath` - Output Path
+ `packwizLoc` - The location of the packwiz executable. This can be left blank if packwiz is on the path.
+ `nameOverride` - Override Name of modpack

