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

    // Créer le workshop
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

    // Créer la branche main par défaut
    const mainBranch = {
        workshopId: workshopResult.meta.last_row_id,
        name: 'main',
        createdAt: new Date(),
        updatedAt: new Date(),
    }

    const branchResult = await useDrizzle().insert(tables.branch).values(mainBranch).execute();
    if(branchResult.error) {
        return createHttpResponse({ status: 500, message: 'Failed to create main branch' })
    }

    return createHttpResponse({
        status: 201,
        data: {
            workshop: newWorkshop,
            branch: mainBranch
        }
    })
})