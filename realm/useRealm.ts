import Realm from 'realm';
import { currentOfflinePath } from './context';
import { isCurrentSession, sessionGeneration } from '../utils/sessionRequests';

async function openScoped(schema: any) {
  const path = currentOfflinePath();
  const generation = sessionGeneration();
  const realm = await Realm.open({ path, schema: [schema] });
  const check = () => {
    if (!isCurrentSession(generation) || currentOfflinePath() !== path) throw new Error('Offline context changed');
  };
  try { check(); } catch (error) { realm.close(); throw error; }
  return { realm, check };
}

const realmWrite = async (schema: any, data: any) => {
  const { realm, check } = await openScoped(schema);

  try {
    check();
    realm.write(() => {
      realm.create(schema.name, data, Realm.UpdateMode.Modified);
    });
  } catch (error) {
    console.error('Failed to write to the Realm database:', error);
    throw error;
  } finally {
    realm.close();
  }
};

const realmUpdate = async (
  schema: any,
  id: string,
  property: any,
  value: any
) => {
  const { realm, check } = await openScoped(schema);

  try {
    check();
    realm.write(() => {
      let object = realm.objectForPrimaryKey(schema.name, id);
      if (!object) {
        console.log('No object found with the primary key:', id);
        return;
      }
      object[property] = value;
    });
  } catch (error) {
    console.error('Failed to update the Realm database:', error);
    throw error;
  } finally {
    realm.close();
  }
};

const realmWriteMultiple = async (schema: any, data: any[]) => {
  const { realm, check } = await openScoped(schema);

  try {
    check();
    realm.write(() => {
      data.forEach((item) => {
        realm.create(schema.name, item, Realm.UpdateMode.Modified);
      });
    });
  } catch (error) {
    console.error('Failed to write to the Realm database:', error);
    throw error;
  } finally {
    console.log(
      `Successfully wrote ${data.length} objects to the Realm database`
    );
    realm.close();
  }
};

const realmRead = async (
  schema: any,
  limit?: number,
  offset?: number,
  sortField?: string,
  sortOrder: 'ASC' | 'DESC' = 'ASC',
  filter?: string
) => {
  const { realm, check } = await openScoped(schema);

  try {
    let objects = realm.objects(schema.name);

    if (filter && filter.trim() !== '') {
      objects = objects.filtered(filter);
    }

    if (sortField && typeof sortField === 'string') {
      objects = objects.sorted(sortField, sortOrder === 'DESC');
    }

    let results;
    if (limit || offset) {
      results = objects.slice(offset, (offset ?? 0) + (limit ?? 0));
    } else {
      results = objects;
    }
    const plainResults = results.map((obj) => Object.assign({}, obj));

    check();
    return plainResults;
  } catch (error) {
    console.error('Failed to query the Realm database:', error);
    throw error;
  } finally {
    realm.close();
  }
};

const realmDeleteOne = async (schema: any, filter: string) => {
  const { realm, check } = await openScoped(schema);

  try {
    check();
    realm.write(() => {
      let objects = realm.objects(schema.name);
      if (filter && filter.trim() !== '') {
        objects = objects.filtered(filter);
      }
      if (objects.length > 0) {
        realm.delete(objects[0]);
      } else {
        console.log('No object found matching the filter.');
      }
    });
  } catch (error) {
    console.error('Failed to delete from the Realm database:', error);
    throw error;
  } finally {
    realm.close();
  }
};

const realmDeleteAll = async (schema: any, filter?: string) => {
  const { realm, check } = await openScoped(schema);

  try {
    check();
    realm.write(() => {
      let objects = realm.objects(schema.name);
      if (filter && filter.trim() !== '') {
        objects = objects.filtered(filter);
      }
      realm.delete(objects);
    });
  } catch (error) {
    console.error('Failed to delete from the Realm database:', error);
    throw error;
  } finally {
    realm.close();
  }
};

export default {
  realmWrite,
  realmWriteMultiple,
  realmUpdate,
  realmRead,
  realmDeleteOne,
  realmDeleteAll,
};
