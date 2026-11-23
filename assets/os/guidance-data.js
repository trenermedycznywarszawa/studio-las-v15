export async function approveHomePlanGuidance(repository, homePlanId, revision) {
    return repository.rpc("approve_home_plan_guidance", { p_home_plan_id: homePlanId, p_expected_revision: revision });
  }

export async function cloneHomePlanGuidance(repository, homePlanId) {
    return repository.rpc("clone_home_plan_guidance", { p_home_plan_id: homePlanId });
  }

export async function editGuidanceDraft(repository, clientId, planId, input) {
    return repository.rest("home_plans", { method: "PATCH",
      query: { id: `eq.${planId}`, client_id: `eq.${clientId}`, status: "eq.draft", approved_at: "is.null" },
      prefer: "return=representation",
      body: { title: input.title, focus: input.focus, instructions: input.instructions,
        frequency: input.frequency, duration: input.duration, guidance_channel: input.guidance_channel }
    }).then(rows => { if (!rows?.length) throw new Error("Szkic zmienił się. Odśwież widok."); return rows; });
  }

export async function editGuidanceDraftItem(repository, clientId, itemId, input) {
    return repository.rest("home_plan_items", { method: "PATCH",
      query: { id: `eq.${itemId}`, client_id: `eq.${clientId}` },
      prefer: "return=representation",
      body: { name: input.name, dosage: input.dosage, frequency: input.frequency,
        client_cue: input.client_cue, stop_criteria: input.stop_criteria,
        video_url: input.video_url || null, status: input.status }
    }).then(rows => { if (!rows?.length) throw new Error("Działanie zmieniło się. Odśwież widok."); return rows; });
  }

export async function saveHomePlan(repository, clientId, input) {
    return repository.insert("home_plans", {
      client_id: clientId,
      title: input.title || null,
      focus: input.focus || null,
      frequency: input.frequency || null,
      duration: input.duration || null,
      instructions: input.instructions || null,
      guidance_channel: input.guidanceChannel || null,
      status: "draft",
      published_at: null
    });
  }

