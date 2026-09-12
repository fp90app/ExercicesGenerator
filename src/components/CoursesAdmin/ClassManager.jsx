import React, { useContext } from 'react';
import { Icon } from '../UI';
import { CoursesAdminContext } from './index';

export default function ClassManager() {
    const {
        selectedLevel,
        currentClasses,
        newClassInput,
        setNewClassInput,
        handleAddClass,
        handleDeleteClass
    } = useContext(CoursesAdminContext);

    return (
        <div className="mb-8 bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
            <h3 className="text-sm font-bold text-indigo-800 mb-3">Classes de {selectedLevel}</h3>
            <div className="flex flex-wrap gap-2 mb-3">
                {currentClasses.map(cls => (
                    <span key={cls} className="bg-white text-indigo-600 px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-2 border border-indigo-100">
                        {cls}
                        <button onClick={() => handleDeleteClass(cls)} className="text-indigo-300 hover:text-red-500">
                            <Icon name="x" size={14} />
                        </button>
                    </span>
                ))}
            </div>
            <div className="flex gap-2 max-w-xs">
                <input
                    placeholder="Ex: 3C"
                    className="flex-1 p-2 rounded-lg border border-indigo-200 text-sm"
                    value={newClassInput}
                    onChange={e => setNewClassInput(e.target.value)}
                />
                <button onClick={handleAddClass} className="bg-indigo-600 text-white px-3 rounded-lg font-bold">
                    <Icon name="plus" />
                </button>
            </div>
        </div>
    );
}