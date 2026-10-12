import type { UserScript } from '../services/user-scripts/types';

export const defaultUserScripts: UserScript[] = [
	{
		id: 'fade-in',
		name: 'Fade In',
		description:
			'Gradually increases volume from empty to the chip maximum, writing only when the level changes',
		code: `local minRow = selection.minRow
local maxRow = selection.maxRow
local totalRows = maxRow - minRow + 1
local lastVolume = {}

for i, row in ipairs(rows) do
    local relativeRow = row.rowIndex - minRow
    local progress = 1
    if totalRows > 1 then
        progress = relativeRow / (totalRows - 1)
    end
    local volume = math.floor(progress * chip.volumeMax + 0.5)
    local channel = row.channelIndex
    if lastVolume[channel] ~= volume then
        row.volume = volume
        lastVolume[channel] = volume
    else
        row.volume = 0
    end
end`
	},
	{
		id: 'fade-out',
		name: 'Fade Out',
		description:
			'Gradually decreases volume from the chip maximum to empty, writing only when the level changes',
		code: `local minRow = selection.minRow
local maxRow = selection.maxRow
local totalRows = maxRow - minRow + 1
local lastVolume = {}

for i, row in ipairs(rows) do
    local relativeRow = row.rowIndex - minRow
    local progress = 1
    if totalRows > 1 then
        progress = relativeRow / (totalRows - 1)
    end
    local volume = math.floor((1 - progress) * chip.volumeMax + 0.5)
    local channel = row.channelIndex
    if lastVolume[channel] ~= volume then
        row.volume = volume
        lastVolume[channel] = volume
    else
        row.volume = 0
    end
end`
	}
];
