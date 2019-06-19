#! /usr/bin/env node

var fs = require('fs'),
    parser = require('fast-xml-parser'),
    path = require('path'),
    crypto = require("crypto");
    request = require('request');

// var exec = require("child_process").exec;
var argv = require('yargs')
    .usage('Usage: $0 <command> [options]')
    .command({
        aliases:['dl'],
        command:"download <manifest> <folder-path>",
        desc:"Download the manifest from a given url.",
        builder:(yargs) => {
            yargs.positional('manifest', { describe:'The manifest.xml url to download.', type:'string' })
            .positional('folder-path', { describe:'The folder path to download to.', type:'string' })
            .demandOption(['manifest', 'folder-path'], 'Please provide both run and path arguments to work with this tool')
        }
    })
    .command({
        aliases:['gen'],
        command:"generate <domain> <from-folder> <versionLabel> [mirrors..]", 
        desc:"Generates a new xml file based on the manifest using the domain given.",
        builder: (yargs) => {
            yargs.positional('domain', { describe:'The domain that will be hosting this manifest.xml file and its files.', type:'string' })
            .positional('from-folder', { describe:'The folder to build the manifest from.', type:'string' })
            .positional('versionLabel', { describe:'The version label to use.', type:'string' })
            .positional('mirrors', { describe:'A list of domains to mirror from.', type:'string' })
        }
    })
    .options({
        /* 'run': {
            alias: 'r',
            describe: 'run your program',
            demandOption: true
        },*/
    })
    .demandCommand(2, "You need to specify at least two commands.")
    .help()
    .wrap(null)
    .example('$0 download https://a.coh.server.com/manifest.xml myFiles', 'Downloads the files from the manifest url and puts them into myFiles folder.')
    .example('$0 generate coh.my-server.com myFiles patchDir mirror1.com', 'Generates an example manifest with additional mirrors from myFiles folder.')
    .argv;

// console.log('argv', argv)
if (argv._[0] == 'dl' || argv._[0] == "download") {
    console.log(`Downloading manifest from ${argv.manifest} to ${argv.folderPath}`)
    try {fs.mkdirSync(`./${argv.folderPath}`, { recursive: true });} catch(e) {}
    var download = function (uri, filename) {
        return new Promise((resolve, rej) => {
            request.head(uri, function (err, res, body) {
                if (err) return rej(err)
                // console.log('content-type:', res.headers['content-type']);
                // console.log('content-length:', res.headers['content-length']);
                request(uri).pipe(fs.createWriteStream(filename)).on('close', resolve);
            });
        })
    };

    (async () => {
        let manifestFile = await download(argv.manifest, `./${argv.folderPath}/manifest.xml`)
        let xml = fs.readFileSync(`./${argv.folderPath}/manifest.xml`, 'utf8')
        let {manifest} = parser.parse(xml, {parseAttributeValue:true, ignoreAttributes:false})
        for (let i = 0; i < manifest.filelist.file.length; i++) {
            let file = manifest.filelist.file[i]
            let pathNew = `./${argv.folderPath}/${file['@_name']}`
            let p = path.parse(pathNew)
            let downloadFile = true
            if (fs.existsSync(pathNew)) {
                downloadFile = !(await checkMd5(pathNew, file['@_md5'].toLowerCase(), () => {}))
            }
            try {fs.mkdirSync(p.dir, { recursive: true });} catch(e) {}
            if (downloadFile) {
                // Add some logic here to retry with mirrors if the file doesn't exist.
                console.log(`Downloading file[${i}/${manifest.filelist.file.length}]: ${pathNew} ${(file['@_size']/1000000).toFixed(2)}MB`)
                await download(file['url'].length && file['url'][0] || file['url'], pathNew)
                await checkMd5(pathNew, file['@_md5'].toLowerCase())
            } else {
                console.log(`File already exists file[${i}/${manifest.filelist.file.length}]: ${pathNew} ${(file['@_size']/1000000).toFixed(2)}MB`)
            }
        }
    })()
}
if (argv._[0] == 'gen' || argv._[0] == "generate") {
    console.log("Generating manifest.")
    const { domain, fromFolder, versionLabel, mirrors } = argv;
    
    (async () => {  
        try {  
            let files = await getFiles(fromFolder)
            let fileList = await Promise.all(files.map(async f => {
                let p = path.relative(`${process.cwd()}/${fromFolder}`, f);
                if (p != '.DS_Store' && p != 'manifest.xml') {
                    return {
                        '@_name':p,
                        '@_size':fs.statSync(f).size,
                        url:[
                            {'#text':`https://${domain}/${versionLabel}/${p}`},
                            ...mirrors.map(d => ({
                                '#text': `https://${d}/${versionLabel}/${p}`
                            }))
                        ],
                        '@_md5': await checkMd5(f, undefined, () => {})
                    }
                }
            }))
            let m = {
                manifest: {
                    label:'City of Heroes Server',
                    profiles:[{
                        launch:[
                            {
                                '@_exec': "Ouroboros.exe",
                                '@_order': "0",
                                '@_params': `-project coh -patchDir ouro -uiskin 0 -auth ${domain}`,
                                '@_website': `https://${domain}/public/`,
                                '#text': "City of Heroes",
                            },
                            {
                                '@_exec': "Ouroboros.exe",
                                '@_order': "1",
                                '@_params': `-project cov -patchDir ouro -uiskin 1 -auth ${domain}`,
                                '@_website': `https://${domain}/public/`,
                                '#text': "City of Villains",
                            },
                            {
                                '@_exec': "Ouroboros.exe",
                                '@_order': "2",
                                '@_params': `-project gr -patchDir ouro -uiskin 2 -auth ${domain}`,
                                '@_website': `https://${domain}/public/`,
                                '#text': "Going Rogue",
                            }
                        ]
                    }],
                    filelist:{
                        file:[...fileList]
                    },
                    forums:{
                        forum:[
                            { 
                                '@_name':'Titan Network',
                                '@_url':'https://www.cohtitan.com/forum/'
                            }
                        ]
                    },
                    launchers:{
                        launcher:{
                            '@_id':'CreamSoda',
                            '@_size': 476672,
                            '@_md5': 'b59e497bc48faee481fe3a7fe2fcd9be',
                            '@_version': '1.01',
                            url:{
                                '#text': 'https://update.cityofheroesrebirth.com/CreamSoda.exe'
                            }
                        }
                    },
                    webpage: `https://${domain}/public/`,
                    poster_image: {
                        '@_url': `https://${domain}/public/images/ouroborosLogo.png`
                    }
                }
            }
            let toXML = new parser.j2xParser({parseAttributeValue:true, ignoreAttributes:false});
            let data = toXML.parse(m)
            fs.writeFileSync('manifest.xml', data, 'utf8')
        } catch(e) {console.log(e)}
    })()
}

async function getFiles(dir) {
  const subdirs = fs.readdirSync(dir);
  const files = await Promise.all(subdirs.map(async (subdir) => {
    const res = path.resolve(dir, subdir);
    return (fs.statSync(res)).isDirectory() ? getFiles(res) : res;
  }));
  return files.reduce((a, f) => a.concat(f), []);
}

var checkMd5 = function (pathNew, md5, print = console.log) {
    return new Promise((res, rej) => {
        let hash = crypto.createHash('md5')
        const input = fs.createReadStream(pathNew);
        input.on('readable', () => {
            // Only one element is going to be produced by the
            // hash stream.
            const data = input.read();
            if (data)
                hash.update(data);
            else {
                let md5sum = hash.digest('hex')
                print(`MD5 check: ${md5sum} ${(md5sum == md5) ? '✓' : '✗'}`);
                res((md5) ? md5sum == md5 : md5sum);
            }
        });
    })
};