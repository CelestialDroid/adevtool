import { Command, flags } from '@oclif/command'

import { DEVICE_CONFIG_FLAGS, loadDeviceConfigs, resolveBuildId } from '../config/device'
import { IMAGE_DOWNLOAD_DIR } from '../config/paths'
import { ImageType, loadBuildIndex } from '../images/build-index'
import { DeviceImage } from '../images/device-image'
import { downloadDeviceImages } from '../images/download'

export default class Download extends Command {
  static description = 'download device factory images, OTAs, and/or vendor packages. Default output location is ' +
    IMAGE_DOWNLOAD_DIR + '. To override it, use ADEVTOOL_IMG_DOWNLOAD_DIR environment variable.'

  static flags = {
    type: flags.string({
      char: 't',
      description: 'type(s) of images to download: factory | ota | vendor/$NAME (e.g. vendor/qcom, vendor/google_devices)',
      default: ['factory'],
      multiple: true,
    }),
    buildId: flags.string({
      char: 'b',
      description: 'build ID(s) of images to download, defaults to the current build ID',
      required: false,
      multiple: true,
    }),
    ...DEVICE_CONFIG_FLAGS,
  }

  async run() {
    let { flags } = this.parse(Download)

    let index = loadBuildIndex()
    let deviceConfigs = loadDeviceConfigs(flags.devices)

    let images: DeviceImage[] = []

    let types = flags.type.map(s => s as ImageType)

    for (let config of await deviceConfigs) {
      for (let type of types) {
        let buildIds = flags.buildId ?? [config.device.build_id]

        for (let buildIdStr of buildIds) {
          let buildId = resolveBuildId(buildIdStr, config)
          let image = DeviceImage.get(await index, config, buildId, type)
          images.push(image)
        }
      }
    }

    let missingImages = await DeviceImage.getMissing(images)

    if (missingImages.length > 0) {
      await downloadDeviceImages(missingImages)
    }

    for (let image of images) {
      this.log(`${image.toString()}: '${image.getPath()}'`)
    }
  }
}
