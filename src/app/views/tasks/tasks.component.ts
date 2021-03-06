import {Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {Task} from '../../model/Task';
import {DataHandlerService} from '../../service/data-handler.service';
import {MatTableDataSource} from '@angular/material/table';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';
import {EditTaskDialogComponent} from '../../dialog/edit-task-dialog/edit-task-dialog.component';
import {MatDialog} from '@angular/material/dialog';
import {ConfirmDialogComponent} from '../../dialog/confirm-dialog/confirm-dialog.component';
import {Category} from '../../model/Category';
import {Priority} from '../../model/Priority';
import {DeviceDetectorService} from 'ngx-device-detector';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit {
  // поля для таблицы( должны совпадать с названиями переменных класса)
  public displayedColumns: string[] = ['color', 'id', 'title', 'date', 'priority', 'category', 'operations', 'select'];
  public dataSource: MatTableDataSource<Task>; // контейнер - источник данных для таблицы
  public tasks: Task[];
  public priorities: Priority[];
  public searchTaskText: string;
  public selectedStatusFilter: boolean;
  public selectedPriorityFilter: Priority;
  // ссылки и компоенты таблицы
  @ViewChild(MatPaginator, {static: false}) private paginator: MatPaginator;
  @ViewChild(MatSort, {static: false}) private sort: MatSort;

  // текущие задачи для отображения на странице

  @Input('tasks')
  private set setTasks(tasks: Task[]) { // напрямую не присваиваем значения в переменную, только через @Input
    this.tasks = tasks;
    this.fillTable();
  }

  @Input('priorities')
  private set setPriorities(priorities: Priority[]) { // напрямую не присваиваем значения в переменную, только через @Input
    this.priorities = priorities;
  }

  @Input()
  selectedCategory: Category;

  @Output()
  updateTask = new EventEmitter<Task>();

  @Output()
  deleteTask = new EventEmitter<Task>();

  @Output()
  selectCategory = new EventEmitter<Category>(); // при нажатии на категорию из списка задач

  @Output()
  filterByStatus = new EventEmitter<boolean>();

  @Output()
  filterByTitle = new EventEmitter<string>();

  @Output()
  filterByPriority = new EventEmitter<Priority>();

  @Output()
  addTask = new EventEmitter<Task>();

  isMobile: boolean;

  constructor(
    private dataHandler: DataHandlerService,
    private dialog: MatDialog,
    private deviceDetector: DeviceDetectorService
  ) {
    this.isMobile = this.deviceDetector.isMobile();
  }

  ngOnInit(): void {
    // this.dataHandler.getAllTasks().subscribe(tasks => this.tasks = tasks);

    // dataSource Обязательно нужно создавать для таблицы, в него присваивается любой источник (БД, массивы)
    this.dataSource = new MatTableDataSource();
    this.onSelectCategory(null);
  }

  // в зависимости от статуса задачи - вернуть цвет названия
  getPriorityColor(task: Task): string {

    // цвет завершенной задачи
    if (task.completed) {
      return '#f8f9fA';
    }

    if (task.priority && task.priority.color) {
      return task.priority.color;
    }
    return '#fff';
  }

  // показывает задачи с применением всех текущих условий (категория, поиск, фильтры и пр.)
  private fillTable(): void {

    if (!this.dataSource) {
      return;
    }
    this.dataSource.data = this.tasks; // обновить источник данных ( т.к. данные массивы tasks обновились)

    this.addTableObject();

    // когда получаем новые данные...
    // чтобы можно было сортировать по столбцам "категория" и "приоритет", т.к. там не примитивные типы, а объекты
    this.dataSource.sortingDataAccessor = (task, colName) => {
      // по каким полям выполнять сортировку для каждого столбца
      switch (colName) {
        case 'priority': {
          return task.priority ? task.priority.id : null;
        }
        case 'category': {
          return task.category ? task.category.title : null;
        }
        case 'date': {
          return task.date ? !task.date : null;
        }
         case 'title': {
          return task.title;
        }
      }
    };
  }

  private addTableObject(): void {
    this.dataSource.sort = this.sort; // компонент для сортировки данных (если необходимо)
    this.dataSource.paginator = this.paginator; // обновить компонент постраничности (кол. записей, страниц)
  }

  public openEditTaskDialog(task: Task): void {

    // открытие диалогового окна
    const dialogRef = this.dialog.open(EditTaskDialogComponent, {data: [task, 'Редактирование задачи', 1], autoFocus: false});

    dialogRef.afterClosed().subscribe(result => {
      // обработка результата
      if (result === 'false') {
        task.completed = false;
        this.updateTask.emit(task);
        return;
      }
      if (result === 'true') {
        task.completed = true;
        this.updateTask.emit(task);
        return;
      }
      if (result === 'delete') {
        this.deleteTask.emit(task);
        return;
      }

      if (result as Task) {
        this.updateTask.emit(task);
        return;
      }
    });
  }

  public openDeleteDialog(task: Task): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      maxWidth: '500px',
      data: {
        dialogTitle: 'Подтвердите действие',
        message: `Вы действительно хотите удалить задачу: "${task.title}"?`
      },
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe( result => {
      if (result) {
        this.deleteTask.emit(task);
      }
      this.fillTable();
    });
  }

  public onToggleStatus(task: Task): void {
    task.completed = !task.completed;
    this.updateTask.emit(task);
  }

  onSelectCategory(category: Category): void {
    this.selectCategory.emit(category);
  }

  onConfirm(): void {

  }

  onFilterByTitle(): void {
    this.filterByTitle.emit(this.searchTaskText);
  }

  onFilterByStatus(value: boolean): void {
    if (value !== this.selectedStatusFilter) {
      this.selectedStatusFilter = value;
      this.filterByStatus.emit(this.selectedStatusFilter);
    }
  }
  onFilterByPriority(value: Priority): void {
    if (value !== this.selectedPriorityFilter) {
      this.selectedPriorityFilter = value;
      this.filterByPriority.emit(this.selectedPriorityFilter);
    }
  }

  openAddTaskDialog(): void {
    const task = new Task(null, '', false, null, this.selectedCategory);

    const dialogRef = this.dialog.open(EditTaskDialogComponent, {data: [task, 'Добавление задачи', 0]});

    dialogRef.afterClosed().subscribe(result => {
      // обработка результата
      if (result) {
        this.addTask.emit(task);
      }
    });
  }

  getMobilePriorityBgColor(task: Task): string {
    if (task.priority != null && !task.completed) {
      return task.priority.color;
    }

    return 'none';
  }
}
