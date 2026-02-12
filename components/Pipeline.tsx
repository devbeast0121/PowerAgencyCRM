
import React, { useState, useEffect } from 'react';
import { GripVertical, Building2, User as UserIcon, Plus, Settings, X, Edit3, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { StatusBadge } from './Shared';

export const Pipeline = ({ contacts, setContactId, onUpdateStatus, pipelines = [], currentPipelineId, setCurrentPipelineId, onCreatePipeline, onUpdatePipeline, onDeletePipeline }: any) => {
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  
  // Pipeline Management UI States
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [manageMode, setManageMode] = useState<'create' | 'edit'>('edit');
  const [formData, setFormData] = useState({ 
      name: '', 
      // Stages can be string (legacy) or object { name, category }
      stages: [] as Array<string | { name: string, category: string }> 
  });
  
  // Default Stages for new pipelines
  const defaultStages = [
      { name: 'Lead', category: 'Lead' },
      { name: 'Contacted', category: 'Lead' },
      { name: 'Proposal', category: 'Lead' },
      { name: 'Negotiation', category: 'Lead' },
      { name: 'Closed', category: 'Customer' },
      { name: 'Lost', category: 'Lost' }
  ];

  const currentPipeline = pipelines.find((p: any) => p.id === currentPipelineId) || pipelines[0];
  
  // Initialize form when opening edit modal
  useEffect(() => {
      if (manageMode === 'edit' && currentPipeline) {
          // Ensure stages are in object format for the form
          const normalizedStages = (currentPipeline.stages || []).map((s: any) => {
              if (typeof s === 'string') return { name: s, category: 'Lead' }; // Default legacy to Lead
              return s;
          });
          setFormData({ name: currentPipeline.name, stages: normalizedStages });
      } else if (manageMode === 'create') {
          setFormData({ name: '', stages: [...defaultStages] });
      }
  }, [manageMode, currentPipeline, isManageModalOpen]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("contactId", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, stageName: string) => {
    e.preventDefault(); 
    if (dragOverStage !== stageName) {
        setDragOverStage(stageName);
    }
  };

  const handleDrop = (e: React.DragEvent, stageName: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const contactId = e.dataTransfer.getData("contactId");
    
    // Find the stage object to get its category
    // Safe access to currentPipeline.stages
    const stages = currentPipeline?.stages || [];
    const stageObj = stages.find((s: any) => {
        if (typeof s === 'string') return s === stageName;
        return s.name === stageName;
    });
    
    // Determine category and if we should update lifecycle
    let category = 'Lead';
    let shouldUpdateLifecycle = true;

    if (stageObj && typeof stageObj === 'object' && stageObj.category) {
        if (stageObj.category === 'No Change') {
            shouldUpdateLifecycle = false;
        } else {
            category = stageObj.category;
        }
    } else {
        // Legacy fallback
        if (stageName === 'Closed') category = 'Customer';
        else if (stageName === 'Lost') category = 'Lost';
    }

    if (contactId && currentPipeline) {
      const payload: any = { 
          status: stageName, 
          pipelineId: currentPipeline.id
      };
      
      // Only add lifecycleStage to payload if it's NOT "No Change"
      if (shouldUpdateLifecycle) {
          payload.lifecycleStage = category;
      }

      onUpdateStatus(contactId, payload);
    }
  };

  const openCreateModal = () => {
      setManageMode('create');
      setIsManageModalOpen(true);
  };

  const openEditModal = () => {
      setManageMode('edit');
      setIsManageModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name.trim() || formData.stages.length === 0) return;

      if (manageMode === 'create') {
          onCreatePipeline(formData);
      } else {
          onUpdatePipeline(currentPipelineId || (currentPipeline ? currentPipeline.id : null), formData);
      }
      setIsManageModalOpen(false);
  };

  const handleDeleteCurrentPipeline = () => {
      if (currentPipeline && confirm(`Are you sure you want to delete "${currentPipeline.name}"? Contacts in this pipeline will lose their view.`)) {
          onDeletePipeline(currentPipeline.id);
          setIsManageModalOpen(false);
      }
  };

  // Stage editing helpers
  const handleStageNameChange = (idx: number, val: string) => {
      const newStages: any[] = [...formData.stages];
      newStages[idx] = { ...newStages[idx], name: val };
      setFormData({ ...formData, stages: newStages });
  };

  const handleStageCategoryChange = (idx: number, val: string) => {
      const newStages: any[] = [...formData.stages];
      newStages[idx] = { ...newStages[idx], category: val };
      setFormData({ ...formData, stages: newStages });
  };

  const handleAddStage = () => {
      setFormData({ ...formData, stages: [...formData.stages, { name: 'New Stage', category: 'Lead' }] });
  };

  const handleDeleteStage = (idx: number) => {
      const newStages = formData.stages.filter((_, i) => i !== idx);
      setFormData({ ...formData, stages: newStages });
  };

  const moveStage = (idx: number, dir: number) => {
      if (idx + dir < 0 || idx + dir >= formData.stages.length) return;
      const newStages = [...formData.stages];
      const temp = newStages[idx];
      newStages[idx] = newStages[idx + dir];
      newStages[idx + dir] = temp;
      setFormData({ ...formData, stages: newStages });
  };

  // Check if we have pipelines to display
  const hasPipelines = pipelines && pipelines.length > 0;

  // Normalize stages for rendering (handle legacy strings)
  const renderableStages = (currentPipeline?.stages || defaultStages).map((s: any) => {
      if (typeof s === 'string') return { name: s, category: s === 'Closed' ? 'Customer' : s === 'Lost' ? 'Lost' : 'Lead' };
      return s;
  });

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50/50">
      {hasPipelines ? (
        <>
          <div className="mb-6 flex justify-between items-center px-4 pt-4 sm:px-0 sm:pt-0">
              <div>
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                      Pipeline 
                      <div className="relative group">
                          <select 
                              className="text-lg font-normal bg-transparent border-b border-dashed border-slate-400 text-slate-600 focus:outline-none focus:border-emerald-500 cursor-pointer py-0.5 pl-1 pr-6 hover:text-emerald-700"
                              value={currentPipelineId}
                              onChange={(e) => setCurrentPipelineId(e.target.value)}
                          >
                              {pipelines.map((p: any) => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                          </select>
                      </div>
                  </h2>
                  <p className="text-slate-500">Manage deal flow and progress.</p>
              </div>
              <div className="flex gap-2">
                  <button onClick={openEditModal} className="p-2 text-slate-500 hover:bg-white hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-slate-200" title="Edit Pipeline">
                      <Settings className="w-5 h-5" />
                  </button>
                  <button onClick={openCreateModal} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                      <Plus className="w-4 h-4" /> New Pipeline
                  </button>
              </div>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 sm:px-0">
            <div className="flex gap-4 h-full min-w-max pb-4 px-1">
              {renderableStages.map((stage: any) => {
                const stageName = stage.name;
                const stageCategory = stage.category; // 'Lead', 'Customer', 'Lost', 'No Change'

                // Filter logic: Contact must have status === stageName AND (pipelineId === current OR (pipelineId missing AND is Default pipeline))
                const isDefault = pipelines.length > 0 && currentPipeline.id === pipelines[0].id;
                
                const stageContacts = contacts.filter((c: any) => {
                    const matchesStage = c.status === stageName;
                    const matchesPipeline = c.pipelineId === currentPipeline.id || (!c.pipelineId && isDefault);
                    return matchesStage && matchesPipeline;
                });

                const isOver = dragOverStage === stageName;
                
                return (
                  <div 
                    key={stageName} 
                    className={`w-72 rounded-xl flex flex-col h-full border transition-all duration-200 ${isOver ? 'bg-emerald-50 border-emerald-300 ring-4 ring-emerald-100/50' : 'bg-slate-100 border-slate-200'}`}
                    onDragOver={(e) => handleDragOver(e, stageName)}
                    onDrop={(e) => handleDrop(e, stageName)}
                    onDragLeave={() => setDragOverStage(null)}
                  >
                    <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{stageName}</h3>
                            {stageCategory !== 'Lead' && stageCategory !== 'No Change' && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${stageCategory === 'Customer' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                    {stageCategory === 'Customer' ? 'Won' : 'Lost'}
                                </span>
                            )}
                        </div>
                        <span className="bg-white px-2 py-0.5 rounded text-xs text-slate-500 font-bold border border-slate-200 shadow-sm">{stageContacts.length}</span>
                    </div>
                    <div className="p-3 overflow-y-auto space-y-3 flex-1 min-h-[100px] scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                      {stageContacts.map((contact: any) => (
                        <div 
                            key={contact.id} 
                            draggable 
                            onDragStart={(e) => handleDragStart(e, contact.id)}
                            onClick={() => setContactId(contact.id)} 
                            className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer active:cursor-grabbing group select-none relative overflow-hidden"
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-emerald-500 transition-colors"></div>
                          <div className="flex items-center gap-2 mb-2">
                              <GripVertical className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 cursor-grab" />
                              {contact.type === 'Company' ? <Building2 className="w-3 h-3 text-orange-500" /> : <UserIcon className="w-3 h-3 text-blue-500" />}
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{contact.type}</span>
                          </div>
                          <div className="font-bold text-slate-800 text-sm mb-0.5">{contact.name}</div>
                          {contact.company && <div className="text-xs text-slate-500 font-medium mb-3">{contact.company}</div>}
                          
                          <div className="flex justify-between items-center border-t border-slate-50 pt-2 mt-1">
                              <div className="text-[10px] text-slate-400 font-medium truncate max-w-[100px]">{contact.title || 'No Title'}</div>
                              <StatusBadge status={contact.status} />
                          </div>
                        </div>
                      ))}
                      {stageContacts.length === 0 && (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 pointer-events-none opacity-50">
                              <div className="w-12 h-12 border-2 border-dashed border-slate-300 rounded-lg mb-2"></div>
                              <span className="text-xs italic">Drop here</span>
                          </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="h-full flex flex-col items-center justify-center bg-slate-50/50 p-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center space-y-4 max-w-md">
                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-sm mx-auto border border-slate-100">
                    <Settings className="w-10 h-10 text-slate-300" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Setup your Pipeline</h2>
                <p className="text-slate-500">Create a custom pipeline to visualize and track your deals through different stages of your workflow.</p>
                <button 
                    onClick={openCreateModal}
                    className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 inline-flex items-center gap-2 transform hover:scale-105 active:scale-95"
                >
                    <Plus className="w-5 h-5" /> Create First Pipeline
                </button>
            </div>
        </div>
      )}

      {/* Pipeline Manager Modal */}
      {isManageModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="flex justify-between items-center p-5 border-b border-slate-100">
                      <h3 className="text-lg font-bold text-slate-800">{manageMode === 'create' ? 'Create Pipeline' : 'Edit Pipeline'}</h3>
                      <button onClick={() => setIsManageModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                  </div>
                  <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                      <div className="p-5 overflow-y-auto space-y-6">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Pipeline Name</label>
                              <input 
                                  required
                                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                                  placeholder="e.g. Sales Pipeline"
                                  value={formData.name}
                                  onChange={e => setFormData({...formData, name: e.target.value})}
                              />
                          </div>
                          
                          <div>
                              <div className="flex justify-between items-center mb-2">
                                  <label className="block text-xs font-bold text-slate-500 uppercase">Stages</label>
                                  <button type="button" onClick={handleAddStage} className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add Stage</button>
                              </div>
                              <div className="space-y-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                  {(formData.stages as any[]).map((stage, idx) => (
                                      <div key={idx} className="flex items-center gap-2 group">
                                          <div className="flex flex-col gap-0.5">
                                              <button type="button" onClick={() => moveStage(idx, -1)} disabled={idx === 0} className="text-slate-300 hover:text-slate-600 disabled:opacity-0"><ArrowUp className="w-3 h-3" /></button>
                                              <button type="button" onClick={() => moveStage(idx, 1)} disabled={idx === formData.stages.length - 1} className="text-slate-300 hover:text-slate-600 disabled:opacity-0"><ArrowDown className="w-3 h-3" /></button>
                                          </div>
                                          <input 
                                              className="flex-1 text-sm border border-slate-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-emerald-500 outline-none"
                                              value={stage.name}
                                              onChange={e => handleStageNameChange(idx, e.target.value)}
                                              placeholder="Stage Name"
                                          />
                                          <select
                                              className={`text-xs border border-slate-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-emerald-500 outline-none ${stage.category === 'Customer' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : stage.category === 'Lost' ? 'text-slate-600 bg-slate-200' : 'text-slate-700 bg-white'}`}
                                              value={stage.category}
                                              onChange={e => handleStageCategoryChange(idx, e.target.value)}
                                          >
                                              <option value="Lead">Open (Lead)</option>
                                              <option value="Customer">Won (Customer)</option>
                                              <option value="Lost">Lost (Archived)</option>
                                              <option value="No Change">No Change</option>
                                          </select>
                                          <button type="button" onClick={() => handleDeleteStage(idx)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded transition-colors" disabled={formData.stages.length <= 1}>
                                              <Trash2 className="w-4 h-4" />
                                          </button>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                      
                      <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                          {manageMode === 'edit' && hasPipelines && pipelines.length > 1 ? (
                              <button type="button" onClick={handleDeleteCurrentPipeline} className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 px-2 py-1 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3" /> Delete</button>
                          ) : <div></div>}
                          <div className="flex gap-2">
                              <button type="button" onClick={() => setIsManageModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-lg">Cancel</button>
                              <button type="submit" className="px-6 py-2 text-sm font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm">Save Changes</button>
                          </div>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
