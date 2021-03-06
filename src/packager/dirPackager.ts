import { Promise as BluebirdPromise } from "bluebird"
import { emptyDir, copy } from "fs-extra-p"
import { warn } from "../util/log"
import { PlatformPackager } from "../platformPackager"
import { debug7zArgs, spawn } from "../util/util"
import { path7za } from "7zip-bin"
import * as path from "path"

const downloadElectron: (options: any) => Promise<any> = BluebirdPromise.promisify(require("electron-download"))

//noinspection JSUnusedLocalSymbols
const __awaiter = require("../util/awaiter")

function createDownloadOpts(opts: any, platform: string, arch: string, electronVersion: string) {
  const downloadOpts = Object.assign({
    cache: opts.cache,
    strictSSL: opts["strict-ssl"]
  }, opts.download)

  subOptionWarning(downloadOpts, "download", "platform", platform)
  subOptionWarning(downloadOpts, "download", "arch", arch)
  subOptionWarning(downloadOpts, "download", "version", electronVersion)
  return downloadOpts
}

function subOptionWarning (properties: any, optionName: any, parameter: any, value: any) {
  if (properties.hasOwnProperty(parameter)) {
    warn(`${optionName}.${parameter} will be inferred from the main options`)
  }
  properties[parameter] = value
}

export async function pack(packager: PlatformPackager<any>, out: string, platform: string, arch: string, electronVersion: string, initializeApp: () => Promise<any>) {
  const electronDist = packager.devMetadata.build.electronDist
  if (electronDist == null) {
    const zipPath = (await BluebirdPromise.all<any>([
      downloadElectron(createDownloadOpts(packager.devMetadata.build, platform, arch, electronVersion)),
      emptyDir(out)
    ]))[0]

    await spawn(path7za, debug7zArgs("x").concat(zipPath, `-o${out}`))
  }
  else {
    await emptyDir(out)
    await copy(path.resolve(packager.info.projectDir, electronDist, "Electron.app"), path.join(out, "Electron.app"))
  }

  if (platform === "darwin" || platform === "mas") {
    await(<any>require("./mac")).createApp(packager, out, initializeApp)
  }
  else {
    await initializeApp()
  }
}