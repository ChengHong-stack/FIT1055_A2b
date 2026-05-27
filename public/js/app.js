document.addEventListener('DOMContentLoaded', () => {
    // Navigation handling
    const navLinks = document.querySelectorAll('.nav-link[data-target]');
    const pageSections = document.querySelectorAll('.page-section');

    function navigateTo(targetId) {
        // Update active class on nav links
        navLinks.forEach(link => {
            if (link.dataset.target === targetId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Show target section, hide others
        pageSections.forEach(section => {
            if (section.id === targetId) {
                section.classList.remove('hidden');
                section.classList.add('active');
            } else {
                section.classList.add('hidden');
                section.classList.remove('active');
            }
        });
    }

    // Attach click events to nav links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.dataset.target;
            navigateTo(targetId);
        });
    });

    // Theme functionality
    const themeToggle = document.getElementById('theme-toggle');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        }
    });

    localStorage.removeItem('wizardComplete');
    document.body.classList.remove('wizard-complete');

    // Make navigateTo available globally for inline onclick handlers
    window.navigateTo = navigateTo;

    // Handle template card selection in Setup Wizard
    const templateCards = document.querySelectorAll('.template-card');
    templateCards.forEach(card => {
        card.addEventListener('click', () => {
            templateCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const radio = card.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
            }
        });
    });

    // Handle format button selection in Export
    const formatBtns = document.querySelectorAll('.format-btn');
    formatBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            formatBtns.forEach(b => {
                b.classList.remove('active');
                b.textContent = b.textContent.replace('◉ ', '');
            });
            btn.classList.add('active');
            btn.textContent = '◉ ' + btn.textContent;
        });
    });
    
    // Handle filter buttons in Audit Ledger
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // ============================
    // Setup Wizard Step Management
    // ============================
    const totalSteps = 4;
    let currentStep = 1;
    const backBtn = document.getElementById('wizard-back-btn');
    const nextBtn = document.getElementById('wizard-next-btn');

    function updateStepper() {
        const stepItems = document.querySelectorAll('#wizard-stepper .step-item');
        stepItems.forEach(item => {
            const stepNum = parseInt(item.dataset.step);
            const circle = item.querySelector('.step-circle');
            const label = item.querySelector('span:last-child');

            circle.classList.remove('active', 'completed');
            label.style.fontWeight = '';
            label.style.color = '';

            if (stepNum < currentStep) {
                circle.classList.add('completed');
                circle.textContent = '✓';
            } else if (stepNum === currentStep) {
                circle.classList.add('active');
                circle.textContent = stepNum;
                label.style.fontWeight = '600';
                label.style.color = 'var(--text-primary)';
            } else {
                circle.textContent = stepNum;
            }
        });
    }

    function showStep(step) {
        for (let i = 1; i <= totalSteps; i++) {
            const panel = document.getElementById('wizard-step-' + i);
            if (panel) panel.style.display = (i === step) ? '' : 'none';
        }

        // Back button visibility
        backBtn.style.visibility = (step === 1) ? 'hidden' : 'visible';

        // Next button text
        if (step === totalSteps) {
            nextBtn.innerHTML = '🚀 Launch Sentinel';
        } else {
            nextBtn.innerHTML = 'Continue &rarr;';
        }

        // Populate confirm page when reaching step 4
        if (step === 4) {
            const orgName = document.getElementById('org-name')?.value || 'Acme Robotics';
            const adminEmail = document.getElementById('admin-email')?.value || '';
            const activeIndustry = document.querySelector('.industry-card.active');
            const activeTemplate = document.querySelector('.template-card.active');

            document.getElementById('confirm-org').textContent = orgName;
            document.getElementById('confirm-email').textContent = adminEmail;
            document.getElementById('confirm-industry').textContent = activeIndustry ? activeIndustry.querySelector('h4').textContent : '—';
            document.getElementById('confirm-template').textContent = activeTemplate ? activeTemplate.querySelector('h4').textContent : '—';
        }
    }

    // Next button
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentStep < totalSteps) {
                currentStep++;
                updateStepper();
                showStep(currentStep);
            } else {
                // Final step — launch
                localStorage.setItem('wizardComplete', 'true');
                document.body.classList.add('wizard-complete');
                navigateTo('dashboard');
            }
        });
    }

    // Back button
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                updateStepper();
                showStep(currentStep);
            }
        });
    }

    // Industry card selection
    const industryCards = document.querySelectorAll('.industry-card');
    industryCards.forEach(card => {
        card.addEventListener('click', () => {
            industryCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
    });

    // ============================
    // Ledger Polling & UI Updates
    // ============================
    function fetchAndRenderLedger() {
        fetch('/api/ledger')
            .then(res => res.json())
            .then(ledger => {
                const humanReviews = ledger.filter(entry => entry.action && entry.action.action_type === 'human_review');
                const reviewedIndexes = humanReviews.map(entry => entry.action.original_index);

                const pendingApprovals = ledger.filter(entry => 
                    entry.action && 
                    entry.action.status === 'REVIEW_NEEDED' &&
                    !reviewedIndexes.includes(entry.index)
                );

                // Update badge
                const badge = document.querySelector('a[data-target="approvals"] .badge');
                if (badge) {
                    badge.textContent = pendingApprovals.length;
                    badge.style.display = pendingApprovals.length > 0 ? '' : 'none';
                }

                // Update Approvals table
                const approvalsTableBody = document.querySelector('#approvals .dashboard-table tbody');
                if (approvalsTableBody) {
                    approvalsTableBody.innerHTML = '';
                    
                    if (pendingApprovals.length === 0) {
                        approvalsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-secondary);">No pending approvals</td></tr>';
                    } else {
                        pendingApprovals.reverse().forEach(entry => {
                            const date = new Date(entry.timestamp);
                            const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
                            
                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td class="text-muted" style="font-size: 12px;">${timeStr}</td>
                                <td><strong>AI Agent</strong></td>
                                <td>${entry.action.action_type || 'Unknown'}</td>
                                <td><span class="tag tag-yellow"><span class="dot dot-yellow"></span> REVIEW NEEDED</span></td>
                                <td><span style="color: var(--color-yellow-bg); font-size: 13px; font-weight: 500;">⏳ Pending</span></td>
                                <td><a href="#" class="link-action" onclick="openReview(${entry.index}, '${entry.action.action_type}'); return false;">Review &rarr;</a></td>
                            `;
                            approvalsTableBody.appendChild(tr);
                        });
                    }
                }

                // Update Audit Ledger table
                const auditTableBody = document.querySelector('#audit-ledger .audit-table tbody');
                let autoApprovedCount = 0;
                let blockedCount = 0;
                let evaluatedCount = Math.max(0, ledger.length - 1); // Exclude SENTINEL_INITIALIZED

                if (auditTableBody) {
                    auditTableBody.innerHTML = '';
                    
                    if (ledger.length === 0) {
                        auditTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-secondary);">No audit logs</td></tr>';
                    } else {
                        [...ledger].reverse().forEach(entry => {
                            const date = new Date(entry.timestamp);
                            const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
                            const actionPayload = entry.action || {};
                            
                            let tagHtml = '';
                            let outcomeHtml = '';
                            
                            if (actionPayload === 'SENTINEL_INITIALIZED') {
                                tagHtml = '<span class="tag tag-blue"><span class="dot dot-blue"></span> INFO</span>';
                                outcomeHtml = '<span style="color: var(--text-secondary); font-weight: 500;">System Started</span>';
                            } else if (actionPayload.status === 'APPROVED_ASYNC') {
                                tagHtml = '<span class="tag tag-green"><span class="dot dot-green"></span> LOW RISK</span>';
                                outcomeHtml = '<span style="color: var(--color-green-bg); font-weight: 500;">Auto-Approved</span>';
                                autoApprovedCount++;
                            } else if (actionPayload.status === 'APPROVED') {
                                tagHtml = '<span class="tag tag-green"><span class="dot dot-green"></span> APPROVED</span>';
                                outcomeHtml = '<span style="color: var(--color-green-bg); font-weight: 500;">Approved</span>';
                            } else if (actionPayload.status === 'REVIEW_NEEDED') {
                                tagHtml = '<span class="tag tag-yellow"><span class="dot dot-yellow"></span> REVIEW NEEDED</span>';
                                outcomeHtml = '<span style="color: var(--color-yellow-bg); font-weight: 500;">Pending Review</span>';
                            } else if (actionPayload.status === 'BLOCKED') {
                                tagHtml = '<span class="tag tag-red"><span class="dot dot-red"></span> CRITICAL</span>';
                                outcomeHtml = '<span style="color: var(--color-red-bg); font-weight: 500;">Blocked</span>';
                                blockedCount++;
                            } else {
                                tagHtml = '<span class="tag tag-red"><span class="dot dot-red"></span> MISC</span>';
                                outcomeHtml = '<span style="color: var(--color-red-bg); font-weight: 500;">Denied / Unknown</span>';
                            }

                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td>
                                    <div class="entry-info">
                                        <span class="entry-id">#${entry.index}</span>
                                        <span class="entry-time">${timeStr}</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="action-text">${actionPayload.action_type || actionPayload}</div>
                                </td>
                                <td>${tagHtml}</td>
                                <td>${outcomeHtml}</td>
                                <td><span class="hash-text">0x${entry.hash.substring(0,8)}...</span></td>
                            `;
                            auditTableBody.appendChild(tr);
                        });
                    }
                }

                // Update Dashboard Statistics
                const statCards = document.querySelectorAll('#dashboard .stat-value');
                if (statCards.length >= 4) {
                    statCards[0].textContent = evaluatedCount;
                    statCards[1].textContent = autoApprovedCount;
                    statCards[2].textContent = pendingApprovals.length;
                    statCards[3].textContent = blockedCount;
                }

                // Update Dashboard Activities Table
                const dashActivitiesBody = document.querySelector('#dashboard .dashboard-table tbody');
                if (dashActivitiesBody) {
                    dashActivitiesBody.innerHTML = '';
                    const recentEvents = [...ledger].filter(e => e.action !== 'SENTINEL_INITIALIZED').reverse().slice(0, 5);
                    
                    if (recentEvents.length === 0) {
                        dashActivitiesBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-secondary);">No recent activity</td></tr>';
                    } else {
                        recentEvents.forEach(entry => {
                            const date = new Date(entry.timestamp);
                            const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
                            const actionPayload = entry.action || {};
                            
                            let riskHtml = '';
                            let statusHtml = '';
                            let actionUiLink = `<a href="#" class="link-action" onclick="navigateTo('audit-ledger'); return false;">View &rarr;</a>`;
                            
                            if (actionPayload.status === 'APPROVED_ASYNC') {
                                riskHtml = '<span class="tag tag-green"><span class="dot dot-green"></span> LOW RISK</span>';
                                statusHtml = '<span style="color: var(--color-green-bg); font-size: 13px; font-weight: 500;">✓ Passed</span>';
                            } else if (actionPayload.status === 'APPROVED') {
                                riskHtml = '<span class="tag tag-green"><span class="dot dot-green"></span> APPROVED</span>';
                                statusHtml = '<span style="color: var(--color-green-bg); font-size: 13px; font-weight: 500;">✓ Approved</span>';
                            } else if (actionPayload.status === 'REVIEW_NEEDED') {
                                riskHtml = '<span class="tag tag-yellow"><span class="dot dot-yellow"></span> REVIEW NEEDED</span>';
                                if (reviewedIndexes.includes(actionPayload.original_index || entry.index)) {
                                    statusHtml = '<span style="color: var(--text-secondary); font-size: 13px; font-weight: 500;">✓ Reviewed</span>';
                                } else {
                                    statusHtml = '<span style="color: var(--color-yellow-bg); font-size: 13px; font-weight: 500;">⏳ Pending</span>';
                                    actionUiLink = `<a href="#" class="link-action" onclick="openReview(${entry.index}, '${actionPayload.action_type}'); return false;">Review &rarr;</a>`;
                                }
                            } else if (actionPayload.status === 'BLOCKED') {
                                riskHtml = '<span class="tag tag-red"><span class="dot dot-red"></span> CRITICAL</span>';
                                statusHtml = '<span style="color: var(--color-red-bg); font-size: 13px; font-weight: 500;">✕ Blocked</span>';
                            } else {
                                riskHtml = '<span class="tag tag-red"><span class="dot dot-red"></span> MISC</span>';
                                statusHtml = '<span style="color: var(--color-red-bg); font-size: 13px; font-weight: 500;">✕ Unknown</span>';
                            }

                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td class="text-muted" style="font-size: 12px;">${timeStr}</td>
                                <td><strong>AI Agent</strong></td>
                                <td>${actionPayload.action_type || 'Unknown'}</td>
                                <td>${riskHtml}</td>
                                <td>${statusHtml}</td>
                                <td>${actionUiLink}</td>
                            `;
                            dashActivitiesBody.appendChild(tr);
                        });
                    }
                }
            })
            .catch(err => console.error("Failed to fetch ledger:", err));
    }

    // Call initially and poll every 2 seconds
    fetchAndRenderLedger();
    setInterval(fetchAndRenderLedger, 2000);

    // ============================
    // Approval Handling
    // ============================
    window.openReview = function(index, actionType) {
        // Update the action review UI with the current item
        const reviewSection = document.getElementById('action-review');
        if (reviewSection) {
            const actionDiv = reviewSection.querySelector('.field-value');
            if (actionDiv) actionDiv.innerHTML = `<strong>${actionType}</strong>`;

            const btnApprove = reviewSection.querySelector('.btn-black');
            if (btnApprove) {
                btnApprove.onclick = () => resolveAction(index, true);
                btnApprove.textContent = "Approve";
            }

            const btnReject = reviewSection.querySelector('.btn-outline');
            if (btnReject) {
                btnReject.onclick = () => resolveAction(index, false);
                btnReject.textContent = "Block";
            }
        }
        navigateTo('action-review');
    };

    window.resolveAction = function(index, approved) {
        fetch('/api/agent/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ original_index: index, approved })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                // Immediately refresh ledger
                fetchAndRenderLedger();
                navigateTo('dashboard');
            }
        })
        .catch(err => console.error("Failed to resolve action:", err));
    };

    // ============================
    // Simulator Tools
    // ============================
    window.simulateAction = function(actionType) {
        fetch('/api/agent/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action_type: actionType })
        })
        .then(res => res.json())
        .then(data => {
            console.log("Simulate Result:", data);
            fetchAndRenderLedger(); // refresh UI immediately
        })
        .catch(err => console.error("Simulate Failed:", err));
    };

    // ============================
    // Rules Modal Handling
    // ============================
    const ruleModal = document.getElementById('rule-modal');
    const closeBtns = ruleModal.querySelectorAll('.close-modal-btn');
    const cancelBtn = document.getElementById('cancel-rule-btn');
    const saveRuleBtn = document.getElementById('save-rule-btn');
    const modalTitle = document.getElementById('rule-modal-title');
    
    const ruleNameInput = document.getElementById('rule-name');
    const ruleConditionsInput = document.getElementById('rule-conditions');
    const ruleJustificationInput = document.getElementById('rule-justification');
    const ruleAuthCodeInput = document.getElementById('rule-auth-code');

    let currentEditRuleElement = null;

    function openRuleModal(isEdit = false, ruleData = {}, ruleElement = null) {
        modalTitle.textContent = isEdit ? 'Edit Rule' : 'New Rule';
        currentEditRuleElement = ruleElement;
        
        const deleteBtn = document.getElementById('delete-rule-btn');
        if (deleteBtn) {
            deleteBtn.style.display = isEdit ? 'block' : 'none';
        }
        
        const riskLevelSelect = document.getElementById('rule-risk-level');
        
        if (isEdit && ruleData) {
            ruleNameInput.value = ruleData.name || '';
            ruleConditionsInput.value = ruleData.conditions || '';
            if (riskLevelSelect) {
                // Approximate mapping from existing tag logic
                if (ruleData.riskType === 'high') riskLevelSelect.value = 'high';
                else if (ruleData.riskType === 'low') riskLevelSelect.value = 'low';
                else riskLevelSelect.value = 'medium';
            }
        } else {
            ruleNameInput.value = '';
            ruleConditionsInput.value = '';
            if (riskLevelSelect) riskLevelSelect.value = 'medium';
        }
        
        ruleJustificationInput.value = '';
        ruleAuthCodeInput.value = '';

        ruleModal.classList.remove('hidden');
        setTimeout(() => {
            ruleModal.classList.add('show');
        }, 10);
    }

    function closeRuleModal() {
        ruleModal.classList.remove('show');
        setTimeout(() => {
            ruleModal.classList.add('hidden');
        }, 200);
    }

    closeBtns.forEach(btn => btn.addEventListener('click', closeRuleModal));
    if (cancelBtn) cancelBtn.addEventListener('click', closeRuleModal);

    if (saveRuleBtn) {
        saveRuleBtn.addEventListener('click', () => {
            if (ruleAuthCodeInput.value.length === 6) {
                const ruleName = ruleNameInput.value || 'New Rule';
                const ruleDesc = ruleConditionsInput.value || ruleJustificationInput.value || 'Rule description';
                const riskSelect = document.getElementById('rule-risk-level');
                const riskValue = riskSelect ? riskSelect.value : 'medium';
                
                let ruleActionsHtml = '';
                if (riskValue === 'low') {
                    ruleActionsHtml = `
                        <span class="tag tag-green"><span class="dot dot-green"></span> LOW RISK</span>
                        <span class="arrow-icon">&rarr;</span>
                        <span class="rule-outcome outcome-green">Auto-approve</span>
                    `;
                } else if (riskValue === 'high') {
                    ruleActionsHtml = `
                        <span class="tag tag-red"><span class="dot dot-red"></span> HIGH RISK</span>
                        <span class="arrow-icon">&rarr;</span>
                        <span class="rule-outcome outcome-red">Block</span>
                    `;
                } else {
                    ruleActionsHtml = `
                        <span class="tag tag-yellow"><span class="dot dot-yellow"></span> REVIEW NEEDED</span>
                        <span class="arrow-icon">&rarr;</span>
                        <span class="rule-outcome outcome-yellow">Human approval</span>
                    `;
                }
                
                if (currentEditRuleElement) {
                    currentEditRuleElement.querySelector('.rule-title').textContent = ruleName;
                    const actionsBox = currentEditRuleElement.querySelector('.rule-actions');
                    if (actionsBox) {
                        const editBtnHtml = '<button class="btn btn-outline edit-rule-btn">Edit</button>';
                        actionsBox.innerHTML = ruleActionsHtml + editBtnHtml;
                    }
                } else {
                    const newRuleHTML = `
                        <div class="card rule-item" style="margin-bottom: 0;">
                            <div class="rule-info">
                                <div class="rule-title-row">
                                    <span class="rule-title">${ruleName}</span>
                                    <span class="tag tag-green"><span class="dot dot-green"></span> Active</span>
                                </div>
                                <span class="rule-description">${ruleDesc}</span>
                                <span class="rule-triggers">0 triggers</span>
                            </div>
                            <div class="rule-actions">
                                ${ruleActionsHtml}
                                <button class="btn btn-outline edit-rule-btn">Edit</button>
                            </div>
                        </div>
                    `;
                    const rulesList = document.querySelector('.rules-list');
                    rulesList.insertAdjacentHTML('afterbegin', newRuleHTML);
                }
                closeRuleModal();
            } else {
                alert('Please enter a valid 6-digit auth code.');
            }
        });
    }

    const deleteRuleBtn = document.getElementById('delete-rule-btn');
    if (deleteRuleBtn) {
        deleteRuleBtn.addEventListener('click', () => {
            if (currentEditRuleElement) {
                currentEditRuleElement.remove();
            }
            closeRuleModal();
        });
    }

    const newRuleBtn = document.querySelector('.admin-banner .btn-black');
    if (newRuleBtn) {
        newRuleBtn.addEventListener('click', () => openRuleModal(false, null, null));
    }

    // Use event delegation for edit buttons to handle newly added rules
    const rulesList = document.querySelector('.rules-list');
    if (rulesList) {
        rulesList.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-outline') || e.target.classList.contains('edit-rule-btn')) {
                const ruleItem = e.target.closest('.rule-item');
                if (ruleItem) {
                    const ruleName = ruleItem.querySelector('.rule-title').textContent;
                    
                    let riskType = 'medium';
                    const actionsHtml = ruleItem.querySelector('.rule-actions').innerHTML || '';
                    if (actionsHtml.includes('dot-red')) riskType = 'high';
                    else if (actionsHtml.includes('dot-green')) riskType = 'low';
                    
                    openRuleModal(true, { name: ruleName, conditions: 'Example conditions...', riskType: riskType }, ruleItem);
                }
            }
        });
    }

    // ============================
    // Hero Three.js Abstract
    // ============================
    function initHeroThree() {
        const container = document.getElementById('hero-three');
        const canvas = document.getElementById('hero-three-canvas');
        if (!container || !canvas || !window.THREE) return;

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x000000, 0);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
        camera.position.set(0, 0, 6.2);

        const ambient = new THREE.AmbientLight(0xffffff, 0.75);
        const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
        keyLight.position.set(4, 5, 6);
        const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.6);
        rimLight.position.set(-4, -2, 3);
        scene.add(ambient, keyLight, rimLight);

        const group = new THREE.Group();
        scene.add(group);

        const pointCount = 900;
        const maxRadius = 2.2;
        const positions = new Float32Array(pointCount * 3);
        const colors = new Float32Array(pointCount * 3);
        const colorTop = new THREE.Color(0x38bdf8);
        const colorMid = new THREE.Color(0x14b8a6);
        const colorBottom = new THREE.Color(0xf59e0b);
        const tempColor = new THREE.Color();

        for (let i = 0; i < pointCount; i++) {
            const radius = 0.8 + Math.random() * (maxRadius - 0.8);
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.cos(phi);
            const z = radius * Math.sin(phi) * Math.sin(theta);
            const index = i * 3;

            positions[index] = x;
            positions[index + 1] = y;
            positions[index + 2] = z;

            const t = (y / maxRadius + 1) / 2;
            if (t < 0.5) {
                tempColor.copy(colorBottom).lerp(colorMid, t / 0.5);
            } else {
                tempColor.copy(colorMid).lerp(colorTop, (t - 0.5) / 0.5);
            }
            colors[index] = tempColor.r;
            colors[index + 1] = tempColor.g;
            colors[index + 2] = tempColor.b;
        }

        const pointsGeometry = new THREE.BufferGeometry();
        pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const pointsMaterial = new THREE.PointsMaterial({
            size: 0.06,
            vertexColors: true,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const points = new THREE.Points(pointsGeometry, pointsMaterial);
        group.add(points);

        const haloGeometry = new THREE.TorusGeometry(1.6, 0.04, 8, 160);
        const haloMaterial = new THREE.PointsMaterial({
            size: 0.045,
            color: 0x60a5fa,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const haloA = new THREE.Points(haloGeometry, haloMaterial);
        haloA.rotation.x = Math.PI / 3;
        haloA.rotation.y = Math.PI / 8;
        const haloB = new THREE.Points(haloGeometry, haloMaterial.clone());
        haloB.rotation.x = -Math.PI / 5;
        haloB.rotation.y = Math.PI / 2.5;
        haloB.scale.set(1.1, 1.1, 1.1);
        group.add(haloA, haloB);

        const frameGeometry = new THREE.IcosahedronGeometry(1.35, 1);
        const frame = new THREE.LineSegments(
            new THREE.EdgesGeometry(frameGeometry),
            new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.15 })
        );
        group.add(frame);

        let hasSize = false;
        function resize() {
            const { clientWidth, clientHeight } = container;
            if (!clientWidth || !clientHeight) {
                return false;
            }
            renderer.setSize(clientWidth, clientHeight, false);
            camera.aspect = clientWidth / clientHeight;
            camera.updateProjectionMatrix();
            hasSize = true;
            return true;
        }
        resize();
        window.addEventListener('resize', resize);

        if (window.ResizeObserver) {
            const observer = new ResizeObserver(() => resize());
            observer.observe(container);
        }

        setTimeout(resize, 150);

        let lastTime = 0;
        function animate(time) {
            const delta = Math.min((time - lastTime) * 0.001, 0.05);
            lastTime = time;
            if (!hasSize) {
                resize();
            }
            group.rotation.y += delta * 0.25;
            group.rotation.x += delta * 0.15;
            haloA.rotation.z += delta * 0.4;
            haloB.rotation.z -= delta * 0.35;
            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);

        function handleHeroClick() {
            navigateTo('setup-wizard');
        }
        container.addEventListener('click', handleHeroClick);
        container.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleHeroClick();
            }
        });
    }

    navigateTo('hero');
    initHeroThree();

    // Initialise wizard
    updateStepper();
    showStep(currentStep);
});
