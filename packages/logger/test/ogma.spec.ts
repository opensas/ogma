import { createMock } from '@golevelup/ts-jest';
import { createWriteStream } from 'fs';
import { LogLevel } from '../src/enums';
import { color as Color, Ogma, OgmaOptions } from '../src';

const dest = createWriteStream('/dev/null');

process.stdout.hasColors = () => true;

const circularObject: any = {};
circularObject.a = 'hello';
circularObject.b = {
  c: circularObject,
};
circularObject.d = () => 'function';
circularObject.e = Symbol('hello');

const logLevels = [
  'SILLY',
  'VERBOSE',
  'FINE',
  'DEBUG',
  'INFO',
  'LOG',
  'WARN',
  'ERROR',
  'FATAL',
];

const mockStream = createMock<NodeJS.WriteStream>();

describe('Ogma Class', () => {
  let ogma: Ogma;
  function createOgmaInstance(options: Partial<OgmaOptions>): Ogma {
    return new Ogma(options);
  }
  function mockCallExpectation(
    ogma: Ogma,
    expectation: string,
    options: {
      context?: string;
      applicaiton?: string;
      requestId?: string;
    } = {},
  ) {
    ogma.log('Hello', options.context, options.applicaiton, options.requestId);
    expect(mockStream.write.mock.calls[0][0]).toEqual(
      expect.stringContaining(expectation),
    );
  }
  afterEach(() => {
    mockStream.write.mockReset();
  });

  describe.each`
    color    | expectation
    ${true}  | ${Color.cyan('[INFO] ') + '| Hello'}
    ${false} | ${'[INFO] | Hello'}
  `(
    'color: $color',
    ({ color, expectation }: { color: boolean; expectation: string }) => {
      beforeEach(() => {
        ogma = createOgmaInstance({
          color,
          stream: mockStream,
        });
      });
      it(color ? 'should write in color' : 'should not write in color', () =>
        mockCallExpectation(ogma, expectation),
      );
    },
  );
  describe.each`
    json     | expectation
    ${true}  | ${{ time: expect.any(String), pid: expect.any(Number), level: 'INFO', message: 'Hello' }}
    ${false} | ${null}
  `(
    'json $json',
    ({ json, expectation }: { json: boolean; expectation: any }) => {
      beforeEach(() => {
        ogma = createOgmaInstance({ json, stream: mockStream });
      });
      it(json ? 'should print in JSON' : 'should not print in JSON', () => {
        ogma.log('Hello');
        if (json) {
          expect(
            JSON.parse(mockStream.write.mock.calls[0][0] as string),
          ).toEqual(expect.objectContaining(expectation));
        } else {
          expect(mockStream.write.mock.calls[0][0]).toEqual(expect.any(String));
        }
      });
    },
  );
  describe.each`
    context           | expectation
    ${'test context'} | ${Color.cyan('[test context]')}
    ${null}           | ${''}
  `(
    'context: $context',
    ({ context, expectation }: { context?: string; expectation: string }) => {
      beforeEach(() => {
        ogma = createOgmaInstance({ context, stream: mockStream });
      });
      it('should add the context to the log', () =>
        mockCallExpectation(ogma, expectation));
    },
  );
  describe.each`
    requestId             | expectation
    ${'1598961763272766'} | ${Color.white('1598961763272766')}
    ${null}               | ${''}
  `(
    'requestId: $requestId',
    ({
      requestId,
      expectation,
    }: {
      requestId?: string;
      expectation: string;
    }) => {
      beforeEach(() => {
        ogma = createOgmaInstance({ stream: mockStream });
      });
      it('should add the requestId to the log', () =>
        mockCallExpectation(ogma, expectation, { requestId }));
    },
  );
  describe.each`
    application   | expectation
    ${'test app'} | ${Color.yellow('[test app]')}
    ${null}       | ${''}
  `(
    'application: $application',
    ({
      application,
      expectation,
    }: {
      application: string;
      expectation: string;
    }) => {
      beforeEach(() => {
        ogma = createOgmaInstance({ application, stream: mockStream });
      });
      it('should add the context to the log', () =>
        mockCallExpectation(ogma, expectation));
    },
  );
  describe.each`
    logLevel
    ${'OFF'}
    ${'ALL'}
    ${'SILLY'}
    ${'VERBOSE'}
    ${'FINE'}
    ${'DEBUG'}
    ${'INFO'}
    ${'LOG'}
    ${'WARN'}
    ${'ERROR'}
    ${'FATAL'}
  `(
    'logLevel: $logLevel',
    ({ logLevel }: { logLevel: keyof typeof LogLevel }) => {
      beforeEach(() => {
        ogma = createOgmaInstance({ logLevel, stream: mockStream });
      });
      it('should call according to log level', () => {
        let ogmaCalls = 0;
        for (const method of logLevels) {
          ogma[method.toLowerCase()]('Hello');
          if (LogLevel[method] >= LogLevel[logLevel]) {
            ogmaCalls++;
          }
        }
        expect(mockStream.write).toBeCalledTimes(ogmaCalls);
      });
    },
  );
  it('should manage circular, function, and symbols in objects', () => {
    ogma = new Ogma({ stream: mockStream });
    ogma.log(circularObject);
    expect(mockStream.write).toBeCalledTimes(1);
    expect(mockStream.write.mock.calls[0][0]).toEqual(
      expect.stringContaining('[Circular]'),
    );
    expect(mockStream.write.mock.calls[0][0]).toEqual(
      expect.stringContaining('[Function]'),
    );
    expect(mockStream.write.mock.calls[0][0]).toEqual(
      expect.stringContaining('[Symbol(hello)]'),
    );
  });
  it('should follow the context, application, and message of a json', () => {
    ogma = new Ogma({
      json: true,
      context: 'json context',
      application: 'json test',
      stream: mockStream,
    });
    ogma.log({ hello: 'world' });
    expect(mockStream.write.mock.calls[0][0]).toEqual(
      expect.stringContaining('json context'),
    );
    expect(mockStream.write.mock.calls[0][0]).toEqual(
      expect.stringContaining('json test'),
    );
    expect(JSON.parse(mockStream.write.mock.calls[0][0] as string)).toEqual(
      expect.objectContaining({ hello: 'world' }),
    );
  });
});

describe('small ogma tests', () => {
  let ogma: Ogma;
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((message) => {
        dest.write(message);
        return true;
      });
  });
  afterEach(() => {
    stdoutSpy.mockReset();
  });
  describe('printError', () => {
    beforeEach(() => {
      ogma = new Ogma();
    });

    it('should make three prints', () => {
      ogma.printError(new Error('This is my error'));
      expect(stdoutSpy).toBeCalledTimes(2);
      expect(stdoutSpy.mock.calls[0][0].includes('Error')).toBeTruthy();
      expect(
        stdoutSpy.mock.calls[1][0].includes('This is my error'),
      ).toBeTruthy();
    });
  });

  describe('Bad log level', () => {
    it('should replace bad with "INFO"', () => {
      ogma = new Ogma({ logLevel: 'bad' as any });
      expect((ogma as any).options.logLevel).toBe('INFO');
      expect(stdoutSpy).toBeCalledTimes(1);
    });

    it('should run the if with options but no logLevel', () => {
      ogma = new Ogma({ color: false });
      expect(stdoutSpy).toBeCalledTimes(0);
    });
  });
});
