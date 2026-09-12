import {decode} from './adventure-save.js';
// Missing data is a first visit. Unreadable data is never permission to replace it.
export function readSave(storage,key,legacyKey=null) {
  const current=storage.getItem(key);
  const raw=current===null&&legacyKey ? storage.getItem(legacyKey) : current;
  if(raw===null)return null;
  const loaded=decode(raw);
  if(!loaded)throw new Error('Your saved adventure could not be read. It has been left untouched.');
  return loaded;
}
