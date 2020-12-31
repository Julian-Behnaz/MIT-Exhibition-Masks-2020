# Can the subaltern speak?

This exhibit was created for the MIT "Generative Unfoldings" project.

## Pre-packaged Bundle
Pre-packaged releases for deployment to a static web server may be found on the [releases page](https://github.com/Julian-Behnaz/MIT-Exhibition-Masks-2020/releases).

## Developing

### First-time Setup

```shell
npm install
```

### Autoreload when making changes

```shell
npm run start
```

## Generating new font atlas

Command:
```shell
    ./msdf-atlas-gen.exe -font Lora-Regular.ttf -type msdf -format png -dimensions 255 255 -imageout Lora_sdf.png -json Lora_layout.json -pxrange 2
```

### Bundling from Source

```shell
npm run build
```

### Deploying after Bundling

```shell
npm run deploy
```

## License

Code licensed under the MIT License. See [LICENSE](./LICENSE).

## Credits
 
Developed by [Behnaz Farahi](http://behnazfarahi.com/) and [Julian Ceipek](http://jceipek.com/).

### 3rd Party Tools and Libraries
- Source text for the Markov text ([media/TEXT.txt](src/media/TEXT.txt)) is an excerpt from the seminal article “Can The Subaltern Speak?” by the feminist theorist [Gayatri Spivak](https://en.wikipedia.org/wiki/Gayatri_Chakravorty_Spivak) (1985).
- Includes a font atlas generated via [Viktor Chlumský's multi-channel signed distance field generator](https://github.com/Chlumsky/msdfgen)
- Uses [three.js](https://threejs.org/) for 3d rendering
- Uses [stats.js](https://github.com/mrdoob/stats.js/) for performance monitoring
- Uses webpack and various extensions for bundling (see [package.json](./package.json))
