import {
  AfterTestCase,
  AfterTestStep,
  AfterTestSuite,
  BaseListener,
  BeforeTestCase,
  BeforeTestSuite,
  ListenerContext,
  Logger,
  Runner,
  RunnerTestCase,
  StepListenerContext,
  TestStatus,
} from '@codewave-ui/core';
import TaskTree from 'tasktree-cli';
import { Task } from 'tasktree-cli/lib/Task';
import { ProgressBar } from 'tasktree-cli/lib/ProgressBar';

export class StandardConsoleReporter extends BaseListener {
  private tree: TaskTree;
  private ts: Task | undefined;
  private tc: Task | undefined;
  private bar: ProgressBar | undefined;

  constructor(eventManager: any, logger: Logger, runner: Runner) {
    super(eventManager, logger, runner);
    this.tree = TaskTree.tree();
  }

  @BeforeTestSuite
  public async bts(context: ListenerContext) {
    this.tree.start({ noProcessExit: true });
    this.ts = this.tree.add(`{bold [${context.testSuiteId}] ${context.testSuiteName}}`);
  }

  @AfterTestSuite
  public async ats(context: ListenerContext) {
    const filteredTC = context.runner.testCases.filter(tc => tc.status === TestStatus.FAILED);
    if (filteredTC.length > 0) {
      try {
        this.ts!.error(undefined, true);
      } catch (_ignored) {
        /* empty */
      }
    } else {
      this.ts!.complete();
    }
    this.tree.stop();
  }

  @BeforeTestCase
  public async btc(context: ListenerContext) {
    this.tc = this.ts!.add(
      `[${context.runner.testCases[context.runner.currentTestCaseIndex].id}] ${context.runner.testCases[context.runner.currentTestCaseIndex].name}`,
    );
    this.bar = this.tc.bar(':bar {cyan.bold :percent} :elapsed second(s)' + '', {
      badges: true,
      clear: false,
    });
    this.bar.tick(10);
  }

  @AfterTestCase
  public async atc(context: ListenerContext) {
    const runnerTC: RunnerTestCase = context.runner.testCases[context.runner.currentTestCaseIndex];
    if (runnerTC.status === TestStatus.FAILED) {
      try {
        this.bar!.fail();
        this.tc!.error(
          runnerTC.exception?.replaceAll('{', '[').replaceAll('}', ']') ||
          'There is exception thrown!',
        );
      } catch (_ignored) {
        /* empty */
      }
    } else if (runnerTC.status === TestStatus.SUCCESS) {
      this.bar!.tick(100).complete();
      this.tc!.complete();
    } else {
      this.bar!.skip();
      this.tc!.skip();
    }
  }

  @AfterTestStep
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async afterStep(context: StepListenerContext) {
    if (this.bar && this.bar.percent < 90) {
      this.bar.tick(2);
    }
  }
}
