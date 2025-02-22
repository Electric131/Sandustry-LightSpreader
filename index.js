const fs = require("fs");
const PNG = require("pngjs").PNG;

const fadeDistance = 16;

function handleImage() {
	const image = this;
	const mapData = image.data;
	const fogData = Buffer.alloc(mapData.length).fill(0);
	for (let i = 0; i < fogData.length; i += 4) {
		fogData[i + 3] = fadeDistance; // Make alpha channel opaque
	}

	function getIndex(x, y) {
		return (image.width * y + x) << 2;
	}

	function isValid(x, y) {
		return !(x < 0 || y < 0 || x >= image.width || y >= image.height);
	}

	function pixelIsSurface(x, y) {
		const colors = ["255, 255, 255", "102, 0, 255"];
		const baseIndex = getIndex(x, y);
		return colors.includes(`${mapData[baseIndex]}, ${mapData[baseIndex + 1]}, ${mapData[baseIndex + 2]}`);
	}

	let activePositions = [];
	function floodFill() {
		const offsets = [
			[-1, 0],
			[1, 0],
			[0, -1],
			[0, 1],
		];
		while (activePositions.length > 0) {
			const [x, y] = activePositions.pop().split(", ").map(Number);
			const index = getIndex(x, y);
			if (pixelIsSurface(x, y)) {
				fogData[index + 3] = 0;
			}
			for (const offset of offsets) {
				const [newX, newY] = [x + offset[0], y + offset[1]];
				if (isValid(newX, newY)) {
					const baseIndex = getIndex(newX, newY);
					// If adjacent pixel can become closer to the surface than it is
					if (fogData[baseIndex + 3] > fogData[index + 3] + 1 && fogData[index + 3] + 1 < fadeDistance) {
						fogData[baseIndex + 3] = fogData[index + 3] + 1;
						activePositions.push(`${newX}, ${newY}`);
					}
				}
			}
		}
	}

	for (let y = 0; y < image.height; y++) {
		for (let x = 0; x < image.width; x++) {
			if (pixelIsSurface(x, y) && fogData[getIndex(x, y) + 3] == fadeDistance) {
				activePositions.push(`${x}, ${y}`);
				floodFill();
			}
		}
	}

	for (let i = 0; i < fogData.length; i += 4) {
		let fadeFactor = fogData[i + 3] / fadeDistance;
		fadeFactor = Math.min(1, Math.max(0, fadeFactor));
		let fadeAmount = 1 - Math.pow(1 - fadeFactor, 2);
		fogData[i + 3] = 255 * fadeAmount;
	}

	fs.writeFileSync(
		"fog_playtest.png",
		PNG.sync.write({
			width: image.width,
			height: image.height,
			data: fogData,
		})
	);
}

fs.createReadStream("map_blueprint_playtest.png").pipe(new PNG()).on("parsed", handleImage);
