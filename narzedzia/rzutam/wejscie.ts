// Czysta logika z openPlan3D (MIT, laanlabs) używana przez edytor Rzut AM — bez interfejsu.
export { readProject } from '$lib/utils/projectValidation';
export { resolveRoomGeometry, resolveRooms, getRoomPolygon } from '$lib/utils/roomDetection';
export { roomHoles } from '$lib/utils/roomNesting';
export { interiorRoomArea } from '$lib/utils/interiorArea';
export { createProjectFromRoomPlan, extractRoomJsonFromZip, isRoomPlanJson } from '$lib/utils/roomplanImport';
export { createDefaultProject } from '$lib/stores/project';
export { doorSymbol } from '$lib/utils/doorSymbol';
export { getCatalogItem, getFurnitureSize } from '$lib/utils/furnitureCatalog';
