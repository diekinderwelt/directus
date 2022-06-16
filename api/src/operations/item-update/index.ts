import { Accountability, PrimaryKey } from '@directus/shared/types';
import { defineOperationApi, toArray } from '@directus/shared/utils';
import { ItemsService } from '../../services';
import { Item } from '../../types';
import { getAccountabilityForRole } from '../../utils/get-accountability-for-role';
import { optionToObject } from '../../utils/operation-options';
import { sanitizeQuery } from '../../utils/sanitize-query';

type Options = {
	collection: string;
	key?: PrimaryKey | PrimaryKey[] | null;
	payload?: Record<string, any> | string | null;
	query?: Record<string, any> | string | null;
	permissions: string; // $public, $trigger, $full, or UUID of a role
};

export default defineOperationApi<Options>({
	id: 'item-update',

	handler: async ({ collection, key, payload, query, permissions }, { accountability, database, getSchema }) => {
		const schema = await getSchema({ database });

		let customAccountability: Accountability | null;

		if (!permissions || permissions === '$trigger') {
			customAccountability = accountability;
		} else if (permissions === '$full') {
			customAccountability = null;
		} else if (permissions === '$public') {
			customAccountability = await getAccountabilityForRole(null, { database, schema, accountability });
		} else {
			customAccountability = await getAccountabilityForRole(permissions, { database, schema, accountability });
		}

		const itemsService: ItemsService = new ItemsService(collection, {
			schema: await getSchema({ database }),
			accountability: customAccountability,
			knex: database,
		});

		const payloadObject: Partial<Item> | Partial<Item>[] | null = optionToObject(payload) ?? null;

		const queryObject = query ? optionToObject(query) : {};
		const sanitizedQueryObject = sanitizeQuery(queryObject, customAccountability);

		if (!payloadObject) {
			return null;
		}

		let result: PrimaryKey | PrimaryKey[] | null;

		if (!key) {
			result = await itemsService.updateByQuery(sanitizedQueryObject, payloadObject);
		} else {
			const keys = toArray(key);

			if (keys.length === 1) {
				result = await itemsService.updateOne(keys[0], payloadObject);
			} else {
				result = await itemsService.updateMany(keys, payloadObject);
			}
		}

		return result;
	},
});
