import React, { useContext } from 'react';
import { CoursesAdminContext } from './index';

const LEVELS = ["6ème", "5ème", "4ème", "3ème"];

export default function LevelSelector() {
    const { selectedLevel, setSelectedLevel } = useContext(CoursesAdminContext);

    return (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {LEVELS.map(lvl => (
                <button
                    key={lvl}
                    onClick={() => setSelectedLevel(lvl)}
                    className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap ${selectedLevel === lvl
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-500 hover:text-indigo-600'
                        }`}
                >
                    {lvl}
                </button>
            ))}
        </div>
    );
}