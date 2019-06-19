# Manifest Generator

This tool can be used to make generating a City of Heroes manifest easier. **Please use at your own risk.** _(Files from other servers may be updated without notice and mismatches or md5 checksums may be off if using mirrors.)_ This is to help generate manifests and to produce the xml structure needed for the current manifest structure. Your websites and/or urls may need to be updated.

This does not use the new Sunrise manifest structure yet.

## Install

```
npm install -g git:https://github.com/grantbi/manifest-generator.git
```

## Use



```
Usage: manifest-generator <command> [options]

Commands:
  manifest-generator download <manifest> <folder-path>                           Download the manifest from a given url.  [aliases: dl]
  manifest-generator generate <domain> <from-folder> <versionLabel> [mirrors..]  Generates a new xml file based on the manifest using the domain given.  [aliases: gen]

Options:
  --version  Show version number  [boolean]
  --help     Show help  [boolean]

Examples:
  manifest-generator download https://a.coh.server.com/manifest.xml myFiles   Downloads the files from the manifest url and puts them into myFiles folder.
  manifest-generator generate coh.my-server.com myFiles patchDir mirror1.com  Generates an example manifest with additional mirrors from myFiles folder

```
