// Netflix风格To-Do List JavaScript

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    // 获取DOM元素
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const sortSelect = document.getElementById('sort-select');
    const modal = document.getElementById('task-detail-modal');
    const modalTaskTitle = document.getElementById('modal-task-title');
    const modalTaskStatus = document.getElementById('modal-task-status');
    const modalTaskPriority = document.getElementById('modal-task-priority');
    const modalTaskDate = document.getElementById('modal-task-date');
    const modalEditBtn = document.getElementById('modal-edit-btn');
    const modalDeleteBtn = document.getElementById('modal-delete-btn');
    const modalToggleBtn = document.getElementById('modal-toggle-btn');
    const closeModal = document.querySelector('.close-modal');
    
    // 统计元素
    const totalTasksEl = document.getElementById('total-tasks');
    const pendingTasksEl = document.getElementById('pending-tasks');
    const completedTasksEl = document.getElementById('completed-tasks');
    const completionRateEl = document.getElementById('completion-rate');
    
    // 应用状态
    let tasks = JSON.parse(localStorage.getItem('netlist-tasks')) || [];
    let currentFilter = 'all';
    let currentSort = 'priority';
    let currentEditingTask = null;
    
    // 初始化应用
    renderTasks();
    updateStats();
    
    // 事件监听器
    taskForm.addEventListener('submit', addTask);
    taskList.addEventListener('click', handleTaskAction);
    filterBtns.forEach(btn => btn.addEventListener('click', setFilter));
    sortSelect.addEventListener('change', setSort);
    closeModal.addEventListener('click', () => modal.style.display = 'none');
    modalEditBtn.addEventListener('click', startEditTask);
    modalDeleteBtn.addEventListener('click', deleteTaskFromModal);
    modalToggleBtn.addEventListener('click', toggleTaskFromModal);
    
    // 点击模态框外部关闭模态框
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // 添加任务
    function addTask(e) {
        e.preventDefault();
        
        const taskText = taskInput.value.trim();
        if (!taskText) return;
        
        const priorityValue = document.querySelector('input[name="priority"]:checked').value;
        
        if (currentEditingTask) {
            // 编辑现有任务
            const taskIndex = tasks.findIndex(task => task.id === currentEditingTask);
            if (taskIndex !== -1) {
                tasks[taskIndex].text = taskText;
                tasks[taskIndex].priority = priorityValue;
                currentEditingTask = null;
                
                // 编辑完成动画
                const editedTask = document.querySelector(`.task-item[data-id="${tasks[taskIndex].id}"]`);
                if (editedTask) {
                    editedTask.classList.add('edited');
                    setTimeout(() => {
                        editedTask.classList.remove('edited');
                    }, 1000);
                }
            }
        } else {
            // 添加新任务
            const newTask = {
                id: Date.now().toString(),
                text: taskText,
                completed: false,
                priority: priorityValue,
                createdAt: new Date().toISOString()
            };
            
            tasks.unshift(newTask); // 添加到数组开头，使新任务显示在顶部
            
            // 播放添加成功音效
            playAddSound();
        }
        
        // 保存到本地存储
        saveTasks();
        
        // 重置表单
        taskForm.reset();
        document.getElementById('priority-high').checked = true;
        taskInput.value = '';
        taskInput.focus();
        
        // 更新UI
        renderTasks();
        updateStats();
        
        // 添加任务动画效果
        const firstTask = taskList.querySelector('.task-item');
        if (firstTask) {
            firstTask.classList.add('adding');
            setTimeout(() => {
                firstTask.classList.remove('adding');
            }, 500);
        }
    }
    
    // 播放添加任务音效
    function playAddSound() {
        // 创建音频上下文
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 创建振荡器
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // 设置音频参数
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4音符
        oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1); // 上升到A5
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        // 连接节点
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // 播放音效
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
    }
    
    // 处理任务操作（完成、编辑、删除）
    function handleTaskAction(e) {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;
        
        const taskId = taskItem.dataset.id;
        const task = tasks.find(t => t.id === taskId);
        
        if (!task) return;
        
        // 处理复选框点击
        if (e.target.classList.contains('status-checkbox')) {
            toggleTaskStatus(taskId);
            return;
        }
        
        // 处理编辑按钮点击
        if (e.target.classList.contains('edit-btn')) {
            e.stopPropagation(); // 阻止事件冒泡，防止打开模态框
            populateForm(task);
            return;
        }
        
        // 处理删除按钮点击
        if (e.target.classList.contains('delete-btn')) {
            e.stopPropagation(); // 阻止事件冒泡，防止打开模态框
            deleteTask(taskId);
            return;
        }
        
        // 点击任务项打开详情模态框
        openTaskModal(task);
    }
    
    // 切换任务状态（完成/未完成）
    function toggleTaskStatus(taskId) {
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
            const wasCompleted = tasks[taskIndex].completed;
            tasks[taskIndex].completed = !wasCompleted;
            
            // 获取任务元素
            const taskElement = document.querySelector(`.task-item[data-id="${taskId}"]`);
            if (taskElement) {
                // 添加状态切换动画
                if (!wasCompleted) {
                    // 标记为完成
                    taskElement.classList.add('task-completed-animation');
                    playCompleteSound();
                } else {
                    // 标记为未完成
                    taskElement.classList.add('task-uncompleted-animation');
                    playUncompleteSound();
                }
                
                // 动画结束后移除类
                setTimeout(() => {
                    taskElement.classList.remove('task-completed-animation');
                    taskElement.classList.remove('task-uncompleted-animation');
                    saveTasks();
                    renderTasks();
                    updateStats();
                }, 600);
            } else {
                // 如果找不到元素（例如从模态框切换），直接更新
                saveTasks();
                renderTasks();
                updateStats();
            }
        }
    }
    
    // 播放完成任务音效
    function playCompleteSound() {
        // 创建音频上下文
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 创建振荡器
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // 设置音频参数 - 上升音阶表示完成
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        // 连接节点
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // 播放音效
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
    }
    
    // 播放取消完成任务音效
    function playUncompleteSound() {
        // 创建音频上下文
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 创建振荡器
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // 设置音频参数 - 下降音阶表示取消完成
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime); // G5
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime + 0.2); // C5
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        // 连接节点
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // 播放音效
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
    }
    
    // 从模态框切换任务状态
    function toggleTaskFromModal() {
        if (currentEditingTask) {
            toggleTaskStatus(currentEditingTask);
            modal.style.display = 'none';
        }
    }
    
    // 填充表单进行编辑
    function populateForm(task) {
        taskInput.value = task.text;
        document.getElementById(`priority-${task.priority}`).checked = true;
        currentEditingTask = task.id;
        taskInput.focus();
    }
    
    // 从模态框开始编辑任务
    function startEditTask() {
        if (currentEditingTask) {
            const task = tasks.find(t => t.id === currentEditingTask);
            if (task) {
                populateForm(task);
                modal.style.display = 'none';
            }
        }
    }
    
    // 删除任务
    function deleteTask(taskId) {
        const confirmDelete = confirm('确定要删除这个任务吗？');
        if (confirmDelete) {
            // 添加删除动画
            const taskElement = document.querySelector(`.task-item[data-id="${taskId}"]`);
            if (taskElement) {
                taskElement.classList.add('deleting');
                
                // 播放删除音效
                playDeleteSound();
                
                // 等待动画完成后再从数组中删除
                setTimeout(() => {
                    tasks = tasks.filter(task => task.id !== taskId);
                    saveTasks();
                    renderTasks();
                    updateStats();
                }, 500);
            } else {
                // 如果找不到元素（例如从模态框删除），直接删除
                tasks = tasks.filter(task => task.id !== taskId);
                saveTasks();
                renderTasks();
                updateStats();
            }
        }
    }
    
    // 播放删除任务音效
    function playDeleteSound() {
        // 创建音频上下文
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 创建振荡器
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // 设置音频参数
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(330, audioContext.currentTime); // E4音符
        oscillator.frequency.exponentialRampToValueAtTime(220, audioContext.currentTime + 0.2); // 下降到A3
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        // 连接节点
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // 播放音效
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
    }
    
    // 从模态框删除任务
    function deleteTaskFromModal() {
        if (currentEditingTask) {
            deleteTask(currentEditingTask);
            modal.style.display = 'none';
        }
    }
    
    // 设置过滤器
    function setFilter(e) {
        filterBtns.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        currentFilter = e.target.dataset.filter;
        renderTasks();
    }
    
    // 设置排序方式
    function setSort(e) {
        currentSort = e.target.value;
        renderTasks();
    }
    
    // 打开任务详情模态框
    function openTaskModal(task) {
        modalTaskTitle.textContent = task.text;
        modalTaskStatus.textContent = task.completed ? '已完成' : '待办';
        modalTaskPriority.textContent = getPriorityText(task.priority);
        modalTaskDate.textContent = formatDate(task.createdAt);
        
        // 设置模态框按钮文本
        modalToggleBtn.textContent = task.completed ? '标记为待办' : '标记为已完成';
        
        // 设置当前编辑的任务ID
        currentEditingTask = task.id;
        
        // 显示模态框
        modal.style.display = 'flex';
    }
    
    // 渲染任务列表
    function renderTasks() {
        // 清空任务列表
        taskList.innerHTML = '';
        
        // 过滤任务
        let filteredTasks = tasks;
        if (currentFilter === 'pending') {
            filteredTasks = tasks.filter(task => !task.completed);
        } else if (currentFilter === 'completed') {
            filteredTasks = tasks.filter(task => task.completed);
        }
        
        // 排序任务
        if (currentSort === 'priority') {
            // 按优先级排序：高 > 中 > 低
            const priorityOrder = { high: 1, medium: 2, low: 3 };
            filteredTasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        } else if (currentSort === 'date-added') {
            // 按添加日期排序（最新的在前）
            filteredTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        
        // 创建任务元素
        filteredTasks.forEach((task, index) => {
            const taskItem = document.createElement('li');
            taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
            taskItem.dataset.id = task.id;
            taskItem.dataset.priority = task.priority;
            
            // 添加延迟动画效果
            taskItem.style.animationDelay = `${index * 0.05}s`;
            
            taskItem.innerHTML = `
                <div class="task-status">
                    <input type="checkbox" class="status-checkbox" ${task.completed ? 'checked' : ''}>
                </div>
                <div class="task-name">${task.text}</div>
                <div class="task-priority priority-${task.priority}">${getPriorityText(task.priority)}</div>
                <div class="task-actions">
                    <button class="task-btn edit-btn" title="编辑"><i class="fas fa-edit"></i></button>
                    <button class="task-btn delete-btn" title="删除"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;
            
            taskList.appendChild(taskItem);
        });
        
        // 如果没有任务，显示空状态
        if (filteredTasks.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <i class="fas fa-clipboard-list"></i>
                <p>没有${currentFilter === 'pending' ? '待办' : currentFilter === 'completed' ? '已完成' : ''}任务</p>
            `;
            taskList.appendChild(emptyState);
        }
    }
    
    // 更新统计信息
    function updateStats() {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.completed).length;
        const pendingTasks = totalTasks - completedTasks;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        totalTasksEl.textContent = totalTasks;
        pendingTasksEl.textContent = pendingTasks;
        completedTasksEl.textContent = completedTasks;
        completionRateEl.textContent = `${completionRate}%`;
    }
    
    // 保存任务到本地存储
    function saveTasks() {
        localStorage.setItem('netlist-tasks', JSON.stringify(tasks));
    }
    
    // 获取优先级文本
    function getPriorityText(priority) {
        switch (priority) {
            case 'high': return '高';
            case 'medium': return '中';
            case 'low': return '低';
            default: return '';
        }
    }
    
    // 格式化日期
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
});

// 添加视觉效果
document.addEventListener('DOMContentLoaded', () => {
    // Logo动画效果
    const logo = document.querySelector('h1');
    logo.addEventListener('mouseover', () => {
        logo.style.textShadow = '0 0 10px rgba(229, 9, 20, 0.8), 0 0 20px rgba(229, 9, 20, 0.5)';
    });
    
    logo.addEventListener('mouseout', () => {
        logo.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
    });
    
    // 添加按钮脉冲效果
    const addBtn = document.querySelector('.add-btn');
    addBtn.addEventListener('mouseover', () => {
        addBtn.style.animation = 'pulse 1s infinite';
    });
    
    addBtn.addEventListener('mouseout', () => {
        addBtn.style.animation = '';
    });
    
    // 任务项悬停效果
    document.addEventListener('mouseover', (e) => {
        if (e.target.closest('.task-item')) {
            const taskItem = e.target.closest('.task-item');
            const priority = taskItem.dataset.priority;
            let glowColor;
            
            switch (priority) {
                case 'high':
                    glowColor = 'rgba(229, 9, 20, 0.2)';
                    break;
                case 'medium':
                    glowColor = 'rgba(232, 124, 3, 0.2)';
                    break;
                case 'low':
                    glowColor = 'rgba(70, 211, 105, 0.2)';
                    break;
                default:
                    glowColor = 'rgba(255, 255, 255, 0.1)';
            }
            
            taskItem.style.boxShadow = `0 0 10px ${glowColor}`;
        }
    });
    
    document.addEventListener('mouseout', (e) => {
        if (e.target.closest('.task-item')) {
            const taskItem = e.target.closest('.task-item');
            taskItem.style.boxShadow = '';
        }
    });
});