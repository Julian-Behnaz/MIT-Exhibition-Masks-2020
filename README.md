# Can the subaltern speak? Exhibit

## First-time Setup

```shell
npm install
```

## Tips:

### Generate Favicon:
https://realfavicongenerator.net/

## Usage

### Live-Reloading Dev Server

```shell
npm run start
```

### Build Minified Deployment

```shell
npm run build
```

### Deploy to Github Pages

```shell
npm run build
npm run deploy
```

### Uses multi-channel signed distance field.
Atlas generator from: https://github.com/Chlumsky/msdfgen

Command:
```
    ./msdf-atlas-gen.exe -font Lora-Regular.ttf -type msdf -format png -dimensions 255 255 -imageout Lora_sdf.png -json Lora_layout.json -pxrange 2
```