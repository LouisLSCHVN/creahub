import { createHttpResponse } from "~~/server/utils/http"
import { createWorkshopValidator } from "~~/shared/validators/workshop";

export default defineEventHandler(async (event) => {
    const { user } = await getUserSession(event)
    if(!user) {
        return createHttpResponse({ status: 401, message: 'Unauthorized' })
    }

    const workshop = await readValidatedBody(event, createWorkshopValidator.safeParseAsync);
    if(!workshop.success) {
        return createValidationError(workshop.error)
    }

    // check if the current user already have this name as a workshop
    const doesWorkshopExist = await useDrizzle()
    .select()
    .from(tables.workshop)
    .where(
        and(
            eq(tables.workshop.ownerId, user.id),
            eq(tables.workshop.name, workshop.data.name)
        )
    )
    .get();

    if (doesWorkshopExist) {
        return createHttpResponse({
            status: 400,
            message: 'You already have a workshop with this name'
        });
    }

    const newWorkshop = {
        ...workshop.data,
        userId: user.id,
        ownerId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
    }

    const workshopResult = await useDrizzle().insert(tables.workshop).values(newWorkshop).execute();
    if(workshopResult.error) {
        return createHttpResponse({ status: 500, message: 'Failed to create workshop' })
    }

    const mainBranch = {
        workshopId: workshopResult.meta.last_row_id,
        name: 'main',
        createdAt: new Date(),
        updatedAt: new Date(),
    }

    const [branchResult] = await useDrizzle().insert(tables.branch).values(mainBranch).returning();
    if(!branchResult?.id) {
        return createHttpResponse({ status: 500, message: 'Failed to create main branch' })
    }

    const folderResult = await useDrizzle().insert(tables.folder).values({
        branchId: branchResult.id,
        name: 'root',
        description: 'Root folder',
        icon: 'i-heroicons-folder',
        userId: newWorkshop.ownerId,
        createdAt: new Date(),
        updatedAt: new Date(),
    }).returning()

    if (!folderResult[0]) {
        return createHttpResponse({ status: 500, message: 'Failed to create root folder' })
    }

    return createHttpResponse({
        status: 201,
        data: {
            workshop: newWorkshop,
            branch: mainBranch
        }
    })
})