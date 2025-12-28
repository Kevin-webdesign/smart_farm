import { Season } from "@/types/season";

export function assignSeasonToHarvest(harvestDate: string, seasons: Season[]): string {
  const date = new Date(harvestDate);
  const month = date.getMonth();
  
  for (const season of seasons) {
    if (month >= season.harvestStartMonth && month <= season.harvestEndMonth) {
      return season.id;
    }
  }
  
  return "unknown";
}

export function getSeasonName(seasonId: string, seasons: Season[]): string {
  const season = seasons.find(s => s.id === seasonId);
  return season ? season.name : "Unknown Season";
}