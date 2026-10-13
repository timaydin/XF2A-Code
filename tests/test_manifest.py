import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from hash_manifest import xenforo_sha256


class XenForoManifestHashTest(unittest.TestCase):
    def test_crlf_lf_and_cr_are_normalized_for_hashing(self):
        self.assertEqual(xenforo_sha256(b'a\r\nb\r\n'), xenforo_sha256(b'a\nb\n'))
        self.assertEqual(xenforo_sha256(b'a\rb'), xenforo_sha256(b'ab'))

    def test_hashing_does_not_mutate_packaged_bytes(self):
        packaged = b'<?php\r\nreturn true;\r\n'
        before = packaged
        xenforo_sha256(packaged)
        self.assertEqual(packaged, before)
        self.assertIn(b'\r\n', packaged)


if __name__ == '__main__':
    unittest.main()
