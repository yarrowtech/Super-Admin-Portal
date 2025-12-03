import React from 'react';

const ITDashboard = () => {
  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-7xl">
        {/* PageHeading */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-neutral-800 dark:text-neutral-100 text-4xl font-black leading-tight tracking-[-0.033em]">
              IT Department Dashboard
            </p>
            <p className="text-neutral-600 dark:text-neutral-400 text-base font-normal leading-normal">
              Overview of IT assets, project statuses, and team allocations.
            </p>
          </div>
          <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] gap-2">
            <span className="material-symbols-outlined text-xl">add_circle</span>
            <span className="truncate">Add New Project</span>
          </button>
        </div>

        {/* SearchBar */}
        <div className="py-6">
          <label className="flex flex-col min-w-40 h-12 w-full">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
              <div className="text-neutral-600 dark:text-neutral-400 flex border-none bg-neutral-100 dark:bg-neutral-800 items-center justify-center pl-4 rounded-l-lg border-r-0">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input 
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-neutral-800 dark:text-neutral-100 focus:outline-0 focus:ring-0 border-none bg-neutral-100 dark:bg-neutral-800 focus:border-none h-full placeholder:text-neutral-600 dark:placeholder:text-neutral-400 px-4 pl-2 text-base font-normal leading-normal" 
                placeholder="Search for resources, projects, or requests..." 
                value=""
              />
            </div>
          </label>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2 rounded-xl bg-white dark:bg-neutral-800/50 p-6 border border-neutral-200 dark:border-neutral-800">
            <p className="text-neutral-800 dark:text-neutral-100 text-base font-medium leading-normal">
              Active Projects
            </p>
            <p className="text-neutral-800 dark:text-neutral-100 tracking-light text-3xl font-bold leading-tight">
              12
            </p>
            <p className="text-green-500 text-sm font-medium leading-normal flex items-center gap-1">
              <span className="material-symbols-outlined text-base">arrow_upward</span>
              <span>+5.2%</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl bg-white dark:bg-neutral-800/50 p-6 border border-neutral-200 dark:border-neutral-800">
            <p className="text-neutral-800 dark:text-neutral-100 text-base font-medium leading-normal">
              Servers Online
            </p>
            <p className="text-neutral-800 dark:text-neutral-100 tracking-light text-3xl font-bold leading-tight">
              48
            </p>
            <p className="text-green-500 text-sm font-medium leading-normal flex items-center gap-1">
              <span className="material-symbols-outlined text-base">arrow_upward</span>
              <span>+0.1%</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl bg-white dark:bg-neutral-800/50 p-6 border border-neutral-200 dark:border-neutral-800">
            <p className="text-neutral-800 dark:text-neutral-100 text-base font-medium leading-normal">
              Open Technician Requests
            </p>
            <p className="text-neutral-800 dark:text-neutral-100 tracking-light text-3xl font-bold leading-tight">
              7
            </p>
            <p className="text-red-500 text-sm font-medium leading-normal flex items-center gap-1">
              <span className="material-symbols-outlined text-base">arrow_downward</span>
              <span>-3.0%</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl bg-white dark:bg-neutral-800/50 p-6 border border-neutral-200 dark:border-neutral-800">
            <p className="text-neutral-800 dark:text-neutral-100 text-base font-medium leading-normal">
              Allocated Resources
            </p>
            <p className="text-neutral-800 dark:text-neutral-100 tracking-light text-3xl font-bold leading-tight">
              85
            </p>
            <p className="text-green-500 text-sm font-medium leading-normal flex items-center gap-1">
              <span className="material-symbols-outlined text-base">arrow_upward</span>
              <span>+10.0%</span>
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="pt-6">
          <div className="flex border-b border-neutral-200 dark:border-neutral-800 gap-8">
            <a className="flex flex-col items-center justify-center border-b-[3px] border-b-primary text-primary pb-[13px] pt-4" href="#">
              <p className="text-primary text-sm font-bold leading-normal tracking-[0.015em]">Operations</p>
            </a>
            <a className="flex flex-col items-center justify-center border-b-[3px] border-b-transparent text-neutral-600 dark:text-neutral-400 pb-[13px] pt-4 hover:border-b-neutral-400" href="#">
              <p className="text-neutral-600 dark:text-neutral-400 text-sm font-bold leading-normal tracking-[0.015em]">Projects</p>
            </a>
            <a className="flex flex-col items-center justify-center border-b-[3px] border-b-transparent text-neutral-600 dark:text-neutral-400 pb-[13px] pt-4 hover:border-b-neutral-400" href="#">
              <p className="text-neutral-600 dark:text-neutral-400 text-sm font-bold leading-normal tracking-[0.015em]">Teams</p>
            </a>
            <a className="flex flex-col items-center justify-center border-b-[3px] border-b-transparent text-neutral-600 dark:text-neutral-400 pb-[13px] pt-4 hover:border-b-neutral-400" href="#">
              <p className="text-neutral-600 dark:text-neutral-400 text-sm font-bold leading-normal tracking-[0.015em]">Resources</p>
            </a>
          </div>
        </div>

        {/* Content Section: Operations */}
        <div className="mt-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Data/Server Operations Card */}
            <div className="flex flex-col gap-4 rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/50">
              <h3 className="text-neutral-800 dark:text-neutral-100 text-lg font-bold">Data/Server Operations</h3>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm">Server Uptime</p>
                  <p className="text-green-400 font-semibold text-sm">99.98%</p>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{width: "99.98%"}}></div>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm">CPU Load</p>
                  <p className="text-yellow-400 font-semibold text-sm">72%</p>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{width: "72%"}}></div>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm">Storage Capacity</p>
                  <p className="text-blue-400 font-semibold text-sm">85%</p>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{width: "85%"}}></div>
                </div>
              </div>
            </div>

            {/* System Assistance Requests Card */}
            <div className="flex flex-col gap-4 rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/50">
              <div className="flex justify-between items-center">
                <h3 className="text-neutral-800 dark:text-neutral-100 text-lg font-bold">System Assistance Requests</h3>
                <span className="text-sm font-bold text-white bg-red-600 rounded-full size-6 flex items-center justify-center">3</span>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium">Network Access for New Hire</p>
                    <p className="text-neutral-600 dark:text-neutral-400 text-xs">#TKT-78923</p>
                  </div>
                  <span className="text-xs font-bold text-red-400 bg-red-500/20 px-2 py-1 rounded-full">High</span>
                </div>
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium">Software Installation Request</p>
                    <p className="text-neutral-600 dark:text-neutral-400 text-xs">#TKT-78922</p>
                  </div>
                  <span className="text-xs font-bold text-yellow-400 bg-yellow-500/20 px-2 py-1 rounded-full">Medium</span>
                </div>
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium">Password Reset for VPN</p>
                    <p className="text-neutral-600 dark:text-neutral-400 text-xs">#TKT-78921</p>
                  </div>
                  <span className="text-xs font-bold text-green-400 bg-green-500/20 px-2 py-1 rounded-full">Low</span>
                </div>
              </div>
            </div>

            {/* Cloud Client Tech Teams */}
            <div className="flex flex-col gap-4 rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/50">
              <h3 className="text-neutral-800 dark:text-neutral-100 text-lg font-bold">Cloud Client Tech Teams</h3>
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-neutral-800 dark:text-neutral-100 font-medium text-sm mb-2">Front-End Team (Workload: 82%)</p>
                  <div className="flex -space-x-2">
                    <img 
                      alt="Team member avatar" 
                      className="inline-block size-8 rounded-full ring-2 ring-white dark:ring-neutral-800" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuD2GfABQDppKgvVluh1_tFrdKvEjLS7GoY1Zo9Bz3xRnJTNxm_PeoSfUKHlxGoDTQi-X2DAlu_fREKu2_zn-PJb_yYtTO7E3r31clrEgU3olnF1u9ZTjHqkT6DJNjPc8AzfP2Uxg4xGicoS7VxKZbT_lFKlFt_2tQb5mhKZnyu-IaCNnZJ7tRlgNAXxwDkwZ6t8wWBchgjv9b_rdlKv8eiHdDz-b_XdceYzbA2QWh_ZWFiTBL3PUYSGFc6In4-BBZq2g_23YpvAzo8P"
                    />
                    <img 
                      alt="Team member avatar" 
                      className="inline-block size-8 rounded-full ring-2 ring-white dark:ring-neutral-800" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuA_dKjmhhHV8syFZo8qCmITo3GBFxKRdOkV9C3xSKKxCG9HuTkWLivBEFi5dH8xtydRjFineUfOSbOGGN4cu-kc5q38FJOJii4cniZpvlHP5Vh2I2Hkh-PQJm5q9mDDsI3WH6plk3MQb1HcKTmgXA7VOhwlP-NEdf08BObxbSaWWEtSiDaT-29reYEEHdA3d1epe9aINizAGVt5EkhkHGNsfyk6CJJCrW83ZEIuJs9pFWIJXbBxm_QgMB-nPYLnYCUKUd9r7HzZ3RcW"
                    />
                    <img 
                      alt="Team member avatar" 
                      className="inline-block size-8 rounded-full ring-2 ring-white dark:ring-neutral-800" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCq0qKB6Muij2tNS2jS0lMoqLGd3ccSl-cLP7A5VR3LTmmnOw2LuTAOvRuFsu08QgLeO1f-5rh2QigiHFG_z136ldig6i7LIyGDypORaB4tFR9RvaACvkKI-q3XFmBiSAZY6fomF4IGN347R9amTXs63N_eZ84KVUXFV0oNmRORi0dH1U5COIGJwPQI6fetqfnSjxyDVWJs5LeKHK5GczCMPGvscZLQoBaP5w5PUukTCahAMLAfXbNevqAxnld1aH9HQ5gBvrSFZXul"
                    />
                    <div className="inline-flex items-center justify-center size-8 rounded-full ring-2 ring-white dark:ring-neutral-800 bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 text-xs font-bold">+3</div>
                  </div>
                </div>
                <div>
                  <p className="text-neutral-800 dark:text-neutral-100 font-medium text-sm mb-2">Back-End Team (Workload: 65%)</p>
                  <div className="flex -space-x-2">
                    <img 
                      alt="Team member avatar" 
                      className="inline-block size-8 rounded-full ring-2 ring-white dark:ring-neutral-800" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBvk2WNsPaRUmhpM5NF-SHJTzc3RXHkWseLIpdTH5H2gdjiL0Fp37hZyJmEBNRrEwaCbXput-vNzkBq_HSr7GolE6-TQq20CxU_dljiLy16HrgRc-SFcFOIizzCxkNRlxf4EZae9treZSokRMtkB481gKvx1DNnV9owaR4yX7_q7O9S_uQXUnOWHJoMeVSEDdnYBmokqWQfG63j4s726cwv8UGw4JSx97e3MKOU34UAiNq9sZnV6Y1e7XLLZdSv54dwYmU6ZdGGwT1G"
                    />
                    <img 
                      alt="Team member avatar" 
                      className="inline-block size-8 rounded-full ring-2 ring-white dark:ring-neutral-800" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuA6PQSLAtqPFjOq0fBcXz7aNKpSjNcLCDFVXSrlb9pR4qMl-Swe1k4dsEdSt8Ja0mfcmjGpJ_kWpSqHW1G-URnAme00pzitkgNV8uoH_HkGvHkjPE4UskgfvcFbcDoA5-drbgFV06ICqw7zX_FQwBAcnaHNwU4UmrAlbzsvGZJ4fIt7bEyof8YlQlvbZ6BGSWBoiZIJtuYl-Gul81UzF7csg0f4Crdm9xQ4R8CcZO86wmi-iOjW3VjHWZfw7kDUbaJBUhN8N9aG2-W_"
                    />
                    <img 
                      alt="Team member avatar" 
                      className="inline-block size-8 rounded-full ring-2 ring-white dark:ring-neutral-800" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCpP7W2_KJcH7-CfzK02fMzwZlfUQNG6c-VrSLOKX4x1JasNW0GnvlZc4fZEcoTNdcshLAgoYJgjSTlx2zoChYjq0PHBW_0qkGy2LZykxf0zgFV78_899KvoIoccAbkXR5NNki5J02yV9yixGC-AeFTpfA57TEgubsNzDWTZ2RMn57shJqzmoNPEJZVSzAaqvwmoLVynneXiQh6MVvHYFCxTZ3Pg_ymasJTBwTJ8GZ-n7U9k5RsWCcMnW3Z1XsZN09Synl7tkHZzJqU"
                    />
                    <div className="inline-flex items-center justify-center size-8 rounded-full ring-2 ring-white dark:ring-neutral-800 bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 text-xs font-bold">+2</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Algorithms Management Table */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/50 overflow-hidden">
            <div className="p-6">
              <h3 className="text-neutral-800 dark:text-neutral-100 text-lg font-bold">Algorithms Management</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-neutral-600 dark:text-neutral-400">
                <thead className="text-xs text-neutral-800 dark:text-neutral-100 uppercase bg-neutral-100 dark:bg-neutral-700">
                  <tr>
                    <th className="px-6 py-3" scope="col">Algorithm Name</th>
                    <th className="px-6 py-3" scope="col">Version</th>
                    <th className="px-6 py-3" scope="col">Status</th>
                    <th className="px-6 py-3" scope="col">Project In Use</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-neutral-200 dark:border-neutral-800">
                    <th className="px-6 py-4 font-medium text-neutral-800 dark:text-neutral-100 whitespace-nowrap" scope="row">Recommendation Engine v2</th>
                    <td className="px-6 py-4">2.1.5</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-green-400 bg-green-500/20 px-2 py-1 rounded-full">Active</span>
                    </td>
                    <td className="px-6 py-4">Project Phoenix</td>
                  </tr>
                  <tr className="border-t border-neutral-200 dark:border-neutral-800">
                    <th className="px-6 py-4 font-medium text-neutral-800 dark:text-neutral-100 whitespace-nowrap" scope="row">Fraud Detection Model</th>
                    <td className="px-6 py-4">1.8.2</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-green-400 bg-green-500/20 px-2 py-1 rounded-full">Active</span>
                    </td>
                    <td className="px-6 py-4">Project Cerberus</td>
                  </tr>
                  <tr className="border-t border-neutral-200 dark:border-neutral-800">
                    <th className="px-6 py-4 font-medium text-neutral-800 dark:text-neutral-100 whitespace-nowrap" scope="row">Sentiment Analysis API</th>
                    <td className="px-6 py-4">3.0.0</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-yellow-400 bg-yellow-500/20 px-2 py-1 rounded-full">In Testing</span>
                    </td>
                    <td className="px-6 py-4">Project Sentinel</td>
                  </tr>
                  <tr className="border-t border-neutral-200 dark:border-neutral-800">
                    <th className="px-6 py-4 font-medium text-neutral-800 dark:text-neutral-100 whitespace-nowrap" scope="row">Legacy Data Sorter</th>
                    <td className="px-6 py-4">0.9.7</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-gray-400 bg-gray-500/20 px-2 py-1 rounded-full">Deprecated</span>
                    </td>
                    <td className="px-6 py-4">N/A</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ITDashboard;