using autosalon.Data;
using autosalon.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using autosalon.Data;
using autosalon.Models;

namespace autosalon.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SalesController : ControllerBase
    {
        private readonly AppDbContext _db;

        public SalesController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var sales = await _db.Sales.ToListAsync();

            return Ok(sales);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var sale = await _db.Sales.FindAsync(id);

            if (sale == null)
                return NotFound();

            return Ok(sale);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Sale sale)
        {
            _db.Sales.Add(sale);

            await _db.SaveChangesAsync();

            return Ok(sale);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] Sale updated)
        {
            var sale = await _db.Sales.FindAsync(id);

            if (sale == null)
                return NotFound();

            await _db.SaveChangesAsync();

            return Ok(sale);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var sale = await _db.Sales.FindAsync(id);

            if (sale == null)
                return NotFound();

            _db.Sales.Remove(sale);

            await _db.SaveChangesAsync();

            return NoContent();
        }
    }
}
